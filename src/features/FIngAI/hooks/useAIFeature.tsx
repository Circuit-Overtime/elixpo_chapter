import React, { useCallback, useState } from "react";
import {  AISuggestionState, UseAISuggestionsReturn } from "../types/types";


export const useAISuggestion = ():UseAISuggestionsReturn => {
     const [state,setState] = useState<AISuggestionState>({ 
        suggestion: null,
        isLoading: false,
        isEnabled: true,
        decoration: [],
        position: null
     });

     const toggedEnabled = useCallback(() => {
         setState((prev) => ({...prev, isEnabled: !prev.isEnabled}))
     },[]);

     const fetchSuggestion = useCallback(async(type: string, editor: any) => {
        //@ts-ignore
          setState((currentState) => {
             if(!currentState.isEnabled) {
                 console.warn("AI suggestions are disabled");
                 return currentState
             }

             if(!editor) {
                console.warn("No editor instance");
                return currentState
             }

             const model = editor.getModel();
             const cursorPositoin = editor.getPosition();
              
            if(!model || !cursorPositoin) {
                 console.warn("Editor model and cursorpositon is not exists");
                 return currentState 
            };
            //@ts-ignore
            const newState = {...currentState, isLoading: true}

            
           ( async () => { 
                    try {
                        
                      const payload = {
                         fileContent: model.getValue(),
                         cursorLine: cursorPositoin.lineNumber - 1,
                         cursorColumn: cursorPositoin.column - 1,
                         suggestionType:  type
                        }
                     const response = await fetch("/api/code-suggestion", {
                         method: "POST",
                         headers: {"Content-type": "application/json"},
                         body: JSON.stringify(payload)
                     });
                     if(!response.ok) {
                        throw new Error(`AI endpoint is not responding ${response.status}`)
                     };
                     const data = await response.json();
                     if(data.suggestion) {
                         const suggestionText = data.suggestion.trim();
                         setState((prev) => ({
                            ...prev,
                            suggestion: suggestionText,
                            position: {
                                line: cursorPositoin.lineNumber,
                                column: cursorPositoin.column
                            },
                            isLoading: false,

                         }))
                     } else {
                          console.warn("No Suggestion recived from API");
                          setState((prev) => ({
                             ...prev,
                             isLoading: false
                          }))
                     }
                    } catch (error) {
                        console.log(`Error Fetching Suggestion ${error}`);
                        setState((prev) => ({
                             ...prev,
                             isLoading: false
                        }))
                    }
                })()
            return newState
          })
     },[]);

     const accpectSuggestion = useCallback((editor: any, monaco: any) => {
          setState((currentState) => {
             if(
                !currentState.suggestion || 
                !currentState.position || 
                !editor || 
                !monaco
              )  {
                return currentState
             }

             const {line,column } = currentState.position;
             const sanitizedSuggestion = currentState.suggestion.replace(/^\d+:\s*/gm, "");
            editor.executeEdits("", [
              {
            range: new monaco.Range(line, column, line, column),
            text: sanitizedSuggestion,
            forceMoveMarkers: true,
              },
            ]);

            if(editor && currentState.decoration.length > 0) {
                 editor.deltaDecorations(currentState.decoration,[]);
            }
         return {
          ...currentState,
          suggestion: null,
          position: null,
          decoration: [],
        };

          })
     },[])
     const rejectSuggestion = useCallback((editor: any) => {
    setState((currentState) => {
      if (editor && currentState.decoration.length > 0) {
        editor.deltaDecorations(currentState.decoration, []);
      }
      return {
        ...currentState,
        suggestion: null,
        position: null,
        decoration: [],
      };
    });
  }, []);

  const clearSuggestion = useCallback((editor: any) => {
    setState((currentState) => {
      if (editor && currentState.decoration.length > 0) {
        editor.deltaDecorations(currentState.decoration, []);
      }
      return {
        ...currentState,
        suggestion: null,
        position: null,
        decoration: [],
      };
    });
  }, []);
      

     return {
        ...state,
        toggedEnabled,
        fetchSuggestion,
        accpectSuggestion,
        rejectSuggestion,
        clearSuggestion

     }
}