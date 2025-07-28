const { useState, useEffect, useRef } = React;

const SUKChat = () => {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);

    // Scroll to bottom when new messages are added
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Load chat history on component mount
    useEffect(() => {
        loadChatHistory();
    }, []);

    const loadChatHistory = async () => {
        try {
            const userId = window.currentUser?.id || 'anonymous';
            console.log('Loading chat history for user:', userId);
            const response = await apiService.getChatHistory(userId);
            console.log('Chat history response:', response);
            if (response.success && response.history) {
                // Transform the history to match the expected format
                const transformedHistory = response.history.map(msg => {
                    let content = msg.content;
                    
                    // For assistant messages, parse JSON if it's a string
                    if (msg.message_type === 'assistant' && typeof content === 'string') {
                        try {
                            content = JSON.parse(content);
                        } catch (e) {
                            console.error('Failed to parse assistant message content:', e);
                            // Keep original content if parsing fails
                        }
                    }
                    
                    return {
                        id: `${msg.timestamp}-${Math.random()}`,
                        type: msg.message_type,
                        content: content,
                        timestamp: msg.timestamp
                    };
                });
                console.log('Transformed history:', transformedHistory);
                setMessages(transformedHistory);
            }
        } catch (error) {
            console.error('Failed to load chat history:', error);
        }
    };

    const sendMessage = async () => {
        if (!inputMessage.trim() || isLoading) return;

        const userMessage = {
            id: Date.now(),
            type: 'user',
            content: inputMessage.trim(),
            timestamp: new Date().toISOString()
        };

        // Add user message to chat
        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);
        setError(null);

        try {
            const userId = window.currentUser?.id || 'anonymous';
            const response = await apiService.sendChatMessage(
                userMessage.content, 
                userId
            );

            if (response && (response.prodotti_soluzioni_esistenti || response.potenziali_fornitori)) {
                // Add assistant response to chat
                const assistantMessage = {
                    id: Date.now() + 1,
                    type: 'assistant',
                    content: response,
                    timestamp: response.timestamp || new Date().toISOString()
                };
                setMessages(prev => [...prev, assistantMessage]);
            } else {
                throw new Error(response.error || 'Failed to send message');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setError(error.message || 'Failed to send message');

            // Add error message to chat
            const errorMessage = {
                id: Date.now() + 1,
                type: 'error',
                content: 'Sorry, I encountered an error processing your message. Please try again.',
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const formatAssistantResponse = (data) => {
        if (!data.prodotti_soluzioni_esistenti && !data.potenziali_fornitori) {
            return <div className="text-gray-600">No data available</div>;
        }

        return (
            <div className="space-y-4">
                {/* Prodotti e Soluzioni Esistenti */}
                {data.prodotti_soluzioni_esistenti && data.prodotti_soluzioni_esistenti.length > 0 && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                            <i data-feather="package" className="w-4 h-4 mr-2"></i>
                            Prodotti e Soluzioni Esistenti
                        </h4>
                        <div className="space-y-2">
                            {data.prodotti_soluzioni_esistenti.map((item, index) => (
                                <div key={index} className="bg-white p-3 rounded border-l-4 border-blue-400">
                                    <h5 className="font-medium text-gray-900">{item.nome_azienda}</h5>
                                    {item.prodotto_soluzione_identificato && (
                                        <p className="text-sm font-medium text-blue-700 mt-1">{item.prodotto_soluzione_identificato}</p>
                                    )}
                                    {item.motivo_del_match && (
                                        <p className="text-sm text-gray-600 mt-2">{item.motivo_del_match}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Potenziali Fornitori */}
                {data.potenziali_fornitori && data.potenziali_fornitori.length > 0 && (
                    <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                            <i data-feather="users" className="w-4 h-4 mr-2"></i>
                            Potenziali Fornitori
                        </h4>
                        <div className="space-y-2">
                            {data.potenziali_fornitori.map((fornitore, index) => (
                                <div key={index} className="bg-white p-3 rounded border-l-4 border-green-400">
                                    <h5 className="font-medium text-gray-900">{fornitore.nome_azienda}</h5>
                                    {fornitore.motivo_del_match && (
                                        <p className="text-sm text-gray-600 mt-2">{fornitore.motivo_del_match}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full">
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <i data-feather="message-circle" className="w-5 h-5 mr-2"></i>
                    SUK Chat
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                    Chiedimi informazioni su prodotti, soluzioni e fornitori
                </p>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center text-gray-500 mt-8">
                        <i data-feather="message-circle" className="w-12 h-12 mx-auto mb-4 text-gray-300"></i>
                        <p>Inizia una conversazione chiedendo informazioni su prodotti o fornitori</p>
                    </div>
                )}

                {messages.map((message) => (
                    <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-3xl px-4 py-2 rounded-lg ${
                            message.type === 'user' 
                                ? 'bg-blue-600 text-white' 
                                : message.type === 'error'
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : 'bg-gray-100 text-gray-900'
                        }`}>
                            {message.type === 'user' ? (
                                <p>{message.content}</p>
                            ) : message.type === 'error' ? (
                                <p className="flex items-center">
                                    <i data-feather="alert-circle" className="w-4 h-4 mr-2"></i>
                                    {message.content}
                                </p>
                            ) : (
                                formatAssistantResponse(message.content)
                            )}
                            <div className={`text-xs mt-2 ${message.type === 'user' ? 'text-blue-200' : 'text-gray-500'}`}>
                                {new Date(message.timestamp).toLocaleTimeString()}
                            </div>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-100 px-4 py-2 rounded-lg">
                            <div className="flex items-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                <span className="text-gray-600">Sto elaborando la tua richiesta...</span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 mx-4 rounded-lg">
                    <div className="flex items-center">
                        <i data-feather="alert-circle" className="w-4 h-4 mr-2"></i>
                        {error}
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="bg-white border-t border-gray-200 p-4">
                <div className="flex space-x-2">
                    <textarea
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Scrivi il tuo messaggio..."
                        className="flex-1 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows="2"
                        disabled={isLoading}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!inputMessage.trim() || isLoading}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <i data-feather="send" className="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        </div>
    );
};

window.SUKChat = SUKChat;