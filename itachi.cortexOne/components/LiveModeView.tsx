import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { XIcon, MicrophoneIcon } from './icons';
import { Session, SpeechRecognition, Message, Role } from '../types';
// FIX: The correct class name is GoogleGenAI, not GoogleGenerativeAI.
import { GoogleGenAI, Chat } from "@google/genai";
import { isApiKeySet } from '../services/geminiService';

const vertexShader = `
  uniform float uTime;
  uniform float uLoudness;
  uniform float uTransition; // 0 = ring, 1 = sphere

  attribute vec3 aTargetPosition;
  attribute float aScale;

  // 2D simplex noise function
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    vec3 ringPos = position;

    // Add rotation to the ring based on time, more rotation when it's a ring.
    // This creates the "loading circle" effect.
    float rotationSpeed = 2.0;
    float rotationFactor = 1.0 - uTransition;
    float angle = uTime * rotationSpeed * rotationFactor;
    mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    ringPos.xy = rot * ringPos.xy;

    // Morph between the (potentially rotated) ring and the target sphere
    vec3 morphedPosition = mix(ringPos, aTargetPosition, uTransition);
    
    // Add noise for idle animation (more prominent on sphere)
    float idleNoise = snoise(morphedPosition.xy * 0.5 + uTime * 0.1) * 0.05 * uTransition;
    vec3 normal = normalize(morphedPosition);
    vec3 idlePosition = morphedPosition + normal * idleNoise;

    // Add loudness-based distortion (the "stretch" effect)
    vec3 finalPosition = idlePosition;
    finalPosition.xy *= (1.0 + uLoudness * 1.5);
    finalPosition.z *= (1.0 + uLoudness * 0.5);

    vec4 modelPosition = modelMatrix * vec4(finalPosition, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;

    gl_Position = projectedPosition;
    gl_PointSize = (aScale * 1.5 + uLoudness * 15.0) * (300.0 / -viewPosition.z);
  }
`;

const fragmentShader = `
  uniform float uLoudness;
  void main() {
    float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
    float strength = 1.0 - (distanceToCenter * 2.0);
    if (strength < 0.0) discard;

    float brightness = 0.5 + uLoudness * 0.5;
    gl_FragColor = vec4(vec3(1.0), strength * brightness);
  }
`;

type ViewState = 'initializing' | 'listening' | 'speaking' | 'responding' | 'error';

interface LiveModeViewProps {
    onClose: () => void;
    session: Session | null;
}

const startGeminiChat = (messages: Message[]) => {
    // Get API key from build-time environment variables
    const apiKey = (import.meta.env.VITE_GEMINI_API_KEY as string) || (window as any).GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('Gemini API key not found. Please set VITE_GEMINI_API_KEY environment variable.');
    }
    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-2.5-flash';
    const history = messages
        .filter(msg => msg.role === Role.USER || msg.role === Role.MODEL)
        .map(msg => ({
            role: msg.role === Role.MODEL ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));
    
    return ai.chats.create({ model, history });
};


const LiveModeView: React.FC<LiveModeViewProps> = ({ onClose, session }) => {
    const [viewState, setViewState] = useState<ViewState>('initializing');
    const [errorText, setErrorText] = useState<string | null>(null);

    const mountRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const uniformsRef = useRef<{ uTime: { value: number }, uLoudness: { value: number }, uTransition: { value: number } } | null>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const chatRef = useRef<Chat | null>(null);
    const isMountedRef = useRef(false);

    useEffect(() => {
        isMountedRef.current = true;
        let isSetupCancelled = false;
        
        const apiKeyOk = isApiKeySet();
        if (!apiKeyOk) {
            setErrorText("Live Mode requires a Gemini API key set in environment variables.");
            setViewState('error');
            return;
        }

        const setup = async () => {
            if (!mountRef.current) return;
            const width = mountRef.current.clientWidth;
            const height = mountRef.current.clientHeight;

            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
            camera.position.z = 4;
            cameraRef.current = camera;
            const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.setSize(width, height);
            mountRef.current?.appendChild(renderer.domElement);
            rendererRef.current = renderer;

            const particleCount = 5000;
            const radius = 2;
            const initialPositions = new Float32Array(particleCount * 3);
            const targetPositions = new Float32Array(particleCount * 3);
            const scales = new Float32Array(particleCount);

            for (let i = 0; i < particleCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const ringRadius = 1.5;
                initialPositions[i * 3] = Math.cos(angle) * ringRadius;
                initialPositions[i * 3 + 1] = Math.sin(angle) * ringRadius;
                initialPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
                const theta = Math.acos(2 * Math.random() - 1);
                const phi = Math.random() * Math.PI * 2;
                targetPositions[i * 3] = radius * Math.sin(theta) * Math.cos(phi);
                targetPositions[i * 3 + 1] = radius * Math.sin(theta) * Math.sin(phi);
                targetPositions[i * 3 + 2] = radius * Math.cos(theta);
                scales[i] = Math.random() * 0.5 + 0.5;
            }

            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(initialPositions, 3));
            geometry.setAttribute('aTargetPosition', new THREE.BufferAttribute(targetPositions, 3));
            geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
            
            const uniforms = { uTime: { value: 0 }, uLoudness: { value: 0 }, uTransition: { value: 1 } };
            uniformsRef.current = uniforms;

            const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
            const particles = new THREE.Points(geometry, material);
            scene.add(particles);

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                if (isSetupCancelled) { stream.getTracks().forEach(t => t.stop()); return; }
                streamRef.current = stream;
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                audioContextRef.current = audioContext;
                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 32;
                analyserRef.current = analyser;
                const source = audioContext.createMediaStreamSource(stream);
                source.connect(analyser);
            } catch (err) {
                console.error("Microphone access denied:", err);
                setErrorText("Microphone access denied.");
                 setViewState('error');
                return;
            }

            const clock = new THREE.Clock();
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

            const animate = () => {
                if (isSetupCancelled) return;
                analyserRef.current?.getByteFrequencyData(dataArray);
                const loudness = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length / 128;
                uniforms.uTime.value = clock.getElapsedTime();
                uniforms.uLoudness.value = Math.min(loudness, 1.0);
                particles.rotation.y += 0.0005;
                renderer.render(scene, camera);
                animationFrameRef.current = requestAnimationFrame(animate);
            };
            animate();
            
            const animateTransition = (startVal: number, endVal: number, duration: number, easingFn: (t: number) => number, onComplete?: () => void) => {
                let startTime: number | null = null;
                const anim = (timestamp: number) => {
                    if (isSetupCancelled) return;
                    if (!startTime) startTime = timestamp;
                    const elapsed = timestamp - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const easedProgress = easingFn(progress);
                    if (uniformsRef.current) {
                        uniformsRef.current.uTransition.value = startVal + (endVal - startVal) * easedProgress;
                    }
                    if (progress < 1) {
                        requestAnimationFrame(anim);
                    } else if (onComplete) {
                        onComplete();
                    }
                };
                requestAnimationFrame(anim);
            };

            const easeInOutQuad = (t: number) => t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

            setTimeout(() => {
                if (isSetupCancelled) return;
                animateTransition(1.0, 0.0, 1000, easeInOutQuad, () => {
                    setTimeout(() => {
                        if (isSetupCancelled) return;
                        animateTransition(0.0, 1.0, 1500, easeOutQuart, () => {
                            if (isMountedRef.current) setViewState('listening');
                        });
                    }, 1200);
                });
            }, 500);

            const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognitionAPI) {
                recognitionRef.current = new SpeechRecognitionAPI();
                const recognition = recognitionRef.current;
                recognition.continuous = false;
                recognition.interimResults = false;

                recognition.onstart = () => isMountedRef.current && setViewState('speaking');
                recognition.onend = () => isMountedRef.current && (viewState !== 'responding' && viewState !== 'error' && setViewState('listening'));
                
                recognition.onerror = (event: any) => {
                    if (event.error !== 'aborted') console.error("Speech recognition error:", event.error);
                };

                recognition.onresult = async (event) => {
                    const transcript = event.results[event.results.length - 1][0].transcript.trim();
                     if (transcript && chatRef.current) {
                        try {
                            setViewState('responding');
                            const response = await chatRef.current.sendMessage({ message: transcript });
                            speak(response.text);
                        } catch (error) {
                            console.error("Gemini API error:", error);
                            setErrorText("Error getting response.");
                            setViewState('error');
                        }
                    } else {
                        setViewState('listening');
                    }
                };
            } else {
                setErrorText("Speech recognition not supported.");
                setViewState('error');
            }
        };

        const handleResize = () => {
            if (mountRef.current && rendererRef.current && cameraRef.current) {
                const newWidth = mountRef.current.clientWidth;
                const newHeight = mountRef.current.clientHeight;
                cameraRef.current.aspect = newWidth / newHeight;
                cameraRef.current.updateProjectionMatrix();
                rendererRef.current.setSize(newWidth, newHeight);
            }
        };

        window.addEventListener('resize', handleResize);
        setup();

        return () => {
            isMountedRef.current = false;
            isSetupCancelled = true;
            window.removeEventListener('resize', handleResize);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            if (rendererRef.current) {
                rendererRef.current.dispose();
                const canvas = mountRef.current?.querySelector('canvas');
                if (canvas && mountRef.current) mountRef.current.removeChild(canvas);
            }
            streamRef.current?.getTracks().forEach(track => track.stop());
            audioContextRef.current?.close().catch(console.error);
            if (recognitionRef.current) recognitionRef.current.abort();
            window.speechSynthesis.cancel();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    
    useEffect(() => {
        if (!recognitionRef.current || viewState === 'error') return;
        if (viewState === 'listening' && !window.speechSynthesis.speaking) {
            try { recognitionRef.current.start(); } catch(e) { /* ignore */ }
        } else if (viewState !== 'speaking') {
            recognitionRef.current.stop();
        }
    }, [viewState]);

    useEffect(() => {
        if (session && isApiKeySet()) {
            chatRef.current = startGeminiChat(session.messages);
        }
    }, [session]);

    const speak = (text: string) => {
        if (!text) {
            setViewState('listening');
            return;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onstart = () => setViewState('responding');
        utterance.onend = () => setViewState('listening');
        utterance.onerror = () => setViewState('listening');
        window.speechSynthesis.speak(utterance);
    };

    const handleToggleListening = () => {
        if (!recognitionRef.current || viewState === 'error') return;
        const isCurrentlyListening = viewState === 'speaking' || viewState === 'listening';
        if (isCurrentlyListening) {
             recognitionRef.current.stop();
             setViewState('listening');
        } else if (viewState !== 'responding') {
            try { recognitionRef.current.start(); } catch(e) { console.warn(e); }
        }
    };
    
    const getStatusText = () => {
        if (errorText) return errorText;
        switch(viewState) {
            case 'initializing': return 'Waking up...';
            case 'listening': return 'Say something...';
            case 'speaking': return 'Listening...';
            case 'responding': return '';
            case 'error': return 'An error occurred.';
            default: return '';
        }
    };
    
    const showGlow = viewState === 'speaking' || viewState === 'responding';

    return (
        <aside className="w-96 bg-black flex-shrink-0 flex flex-col items-center justify-center relative border-l border-white/10 animate-slide-in-right overflow-hidden">
            <div ref={mountRef} className="absolute inset-0" />
            
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <div 
                    className={`absolute rounded-full bg-yellow-400/80 blur-3xl transition-opacity duration-500 ease-in-out`}
                    style={{ 
                        width: '350px',
                        height: '350px',
                        opacity: showGlow ? 0.3 : 0,
                    }}
                />
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-8 flex flex-col items-center justify-center gap-8 z-10">
                 <p className={`text-lg h-6 transition-opacity duration-300 ${viewState === 'error' ? 'text-red-400' : 'text-cyan-200'}`}>
                    {getStatusText()}
                </p>

                <div className="flex items-center gap-8">
                    <button onClick={onClose} className="p-4 bg-black/30 border-2 border-gray-700 rounded-full text-gray-400 hover:border-gray-400 hover:text-white transition-colors">
                        <XIcon className="h-6 w-6" />
                    </button>
                     <button 
                        onClick={handleToggleListening} 
                        disabled={viewState === 'responding' || viewState === 'error' || viewState === 'initializing'}
                        className="p-4 bg-black/30 border-2 border-gray-700 rounded-full text-white transition-colors disabled:opacity-50"
                    >
                        <MicrophoneIcon className="h-8 w-8" />
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default LiveModeView;