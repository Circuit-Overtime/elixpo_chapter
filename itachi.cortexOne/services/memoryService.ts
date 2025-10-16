import { Message, Role } from '../types';

export interface MemoryEntry {
    id: string;
    timestamp: number;
    content: string;
    context: string;
    importance: number; // 1-10 scale
    sessionId: string;
    messageId: string;
}

export interface ConversationSummary {
    sessionId: string;
    summary: string;
    keyTopics: string[];
    timestamp: number;
}

class MemoryService {
    private memories: MemoryEntry[] = [];
    private summaries: ConversationSummary[] = [];
    private maxMemories = 1000;
    private maxSummaries = 100;

    // Store important information from conversations
    addMemory(entry: Omit<MemoryEntry, 'id' | 'timestamp'>): void {
        const memory: MemoryEntry = {
            ...entry,
            id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now()
        };

        this.memories.push(memory);
        
        // Keep only the most recent memories
        if (this.memories.length > this.maxMemories) {
            this.memories = this.memories
                .sort((a, b) => b.importance - a.importance || b.timestamp - a.timestamp)
                .slice(0, this.maxMemories);
        }

        this.saveToStorage();
    }

    // Extract important information from messages
    extractMemoriesFromMessages(messages: Message[], sessionId: string): void {
        for (const message of messages) {
            if (message.role === Role.USER) {
                // Extract user preferences, facts, and important statements
                const content = message.content.toLowerCase();
                let importance = 1;

                // Increase importance for certain patterns
                if (content.includes('my name is') || content.includes('i am') || content.includes('i\'m')) {
                    importance = 9; // Personal information is very important
                }
                if (content.includes('i like') || content.includes('i prefer') || content.includes('i hate')) {
                    importance = 7; // Preferences are important
                }
                if (content.includes('remember') || content.includes('don\'t forget')) {
                    importance = 8; // Explicit memory requests
                }
                if (content.includes('my') && (content.includes('job') || content.includes('work') || content.includes('company'))) {
                    importance = 6; // Work-related info
                }

                if (importance > 3 || message.content.length > 100) {
                    this.addMemory({
                        content: message.content,
                        context: this.extractContext(messages, message),
                        importance,
                        sessionId,
                        messageId: message.id
                    });
                }
            }
        }
    }

    // Get relevant memories for current conversation
    getRelevantMemories(query: string, sessionId: string, limit: number = 5): MemoryEntry[] {
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);

        return this.memories
            .filter(memory => {
                // Include memories from current session with higher priority
                if (memory.sessionId === sessionId) return true;
                
                // Include memories that match query terms
                const contentLower = memory.content.toLowerCase();
                return queryWords.some(word => contentLower.includes(word));
            })
            .sort((a, b) => {
                // Prioritize current session, then importance, then recency
                const aSessionBonus = a.sessionId === sessionId ? 1000 : 0;
                const bSessionBonus = b.sessionId === sessionId ? 1000 : 0;
                
                return (b.importance + bSessionBonus) - (a.importance + aSessionBonus) ||
                       b.timestamp - a.timestamp;
            })
            .slice(0, limit);
    }

    // Create conversation summary
    addSummary(sessionId: string, messages: Message[]): void {
        const userMessages = messages.filter(m => m.role === Role.USER);
        const modelMessages = messages.filter(m => m.role === Role.MODEL);
        
        if (userMessages.length === 0) return;

        // Extract key topics from user messages
        const keyTopics = this.extractKeyTopics(userMessages);
        
        // Create a simple summary
        const summary = this.createSummary(userMessages, modelMessages);

        const conversationSummary: ConversationSummary = {
            sessionId,
            summary,
            keyTopics,
            timestamp: Date.now()
        };

        this.summaries.push(conversationSummary);
        
        // Keep only recent summaries
        if (this.summaries.length > this.maxSummaries) {
            this.summaries = this.summaries
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, this.maxSummaries);
        }

        this.saveToStorage();
    }

    // Get conversation context for AI
    getConversationContext(currentMessages: Message[], sessionId: string): string {
        const relevantMemories = this.getRelevantMemories(
            currentMessages.slice(-3).map(m => m.content).join(' '),
            sessionId,
            3
        );

        const recentSummaries = this.summaries
            .filter(s => s.sessionId !== sessionId)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 2);

        let context = '';

        if (relevantMemories.length > 0) {
            context += 'Previous conversation context:\n';
            relevantMemories.forEach(memory => {
                context += `- ${memory.content}\n`;
            });
            context += '\n';
        }

        if (recentSummaries.length > 0) {
            context += 'Recent conversation topics:\n';
            recentSummaries.forEach(summary => {
                context += `- ${summary.summary}\n`;
            });
            context += '\n';
        }

        return context;
    }

    private extractContext(messages: Message[], targetMessage: Message): string {
        const index = messages.findIndex(m => m.id === targetMessage.id);
        const contextMessages = messages.slice(Math.max(0, index - 2), index + 3);
        return contextMessages.map(m => `${m.role}: ${m.content.substring(0, 100)}`).join(' | ');
    }

    private extractKeyTopics(messages: Message[]): string[] {
        const text = messages.map(m => m.content).join(' ').toLowerCase();
        const words = text.split(/\s+/);
        const wordCount: Record<string, number> = {};

        // Count significant words
        words.forEach(word => {
            const cleaned = word.replace(/[^\w]/g, '');
            if (cleaned.length > 3 && !this.isStopWord(cleaned)) {
                wordCount[cleaned] = (wordCount[cleaned] || 0) + 1;
            }
        });

        // Return top topics
        return Object.entries(wordCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([word]) => word);
    }

    private createSummary(userMessages: Message[], modelMessages: Message[]): string {
        const topics = this.extractKeyTopics(userMessages);
        const messageCount = userMessages.length;
        
        if (topics.length === 0) return `Conversation with ${messageCount} messages`;
        
        return `Discussion about ${topics.slice(0, 3).join(', ')} (${messageCount} messages)`;
    }

    private isStopWord(word: string): boolean {
        const stopWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'she', 'use', 'way', 'will', 'with'];
        return stopWords.includes(word);
    }

    private saveToStorage(): void {
        try {
            localStorage.setItem('ai-memories', JSON.stringify(this.memories));
            localStorage.setItem('ai-summaries', JSON.stringify(this.summaries));
        } catch (error) {
            console.error('Failed to save memories to storage:', error);
        }
    }

    private loadFromStorage(): void {
        try {
            const memoriesData = localStorage.getItem('ai-memories');
            const summariesData = localStorage.getItem('ai-summaries');
            
            if (memoriesData) {
                this.memories = JSON.parse(memoriesData);
            }
            if (summariesData) {
                this.summaries = JSON.parse(summariesData);
            }
        } catch (error) {
            console.error('Failed to load memories from storage:', error);
            this.memories = [];
            this.summaries = [];
        }
    }

    // Initialize the service
    init(): void {
        this.loadFromStorage();
    }

    // Clear all memories (for privacy)
    clearMemories(): void {
        this.memories = [];
        this.summaries = [];
        this.saveToStorage();
    }

    // Get memory statistics
    getStats(): { memoryCount: number; summaryCount: number; oldestMemory?: number } {
        return {
            memoryCount: this.memories.length,
            summaryCount: this.summaries.length,
            oldestMemory: this.memories.length > 0 ? Math.min(...this.memories.map(m => m.timestamp)) : undefined
        };
    }
}

export const memoryService = new MemoryService();