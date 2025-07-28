
const { useState, useEffect, useRef } = React;

const SUKChat = () => {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [chatHistory, setChatHistory] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [showHistory, setShowHistory] = useState(false);
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

    // Remove feather icons initialization to prevent DOM conflicts

    const loadChatHistory = async () => {
        try {
            const userId = window.currentUser?.id || 'anonymous';
            console.log('Loading chat history for user:', userId);
            const response = await apiService.getChatHistory(userId);
            console.log('Chat history response:', response);
            if (response.success && response.history) {
                // Group messages by conversation (simplified: group consecutive messages)
                const conversations = groupMessagesIntoConversations(response.history);
                setChatHistory(conversations);
                
                // If no conversation is selected, show the latest one
                if (conversations.length > 0 && !selectedConversation) {
                    setSelectedConversation(conversations[0]);
                    setMessages(transformMessages(conversations[0].messages));
                }
            }
        } catch (error) {
            console.error('Failed to load chat history:', error);
        }
    };

    const groupMessagesIntoConversations = (history) => {
        const conversations = [];
        let currentConversation = null;
        
        history.forEach((msg, index) => {
            if (msg.message_type === 'user') {
                // Start a new conversation with user message
                if (currentConversation) {
                    conversations.push(currentConversation);
                }
                currentConversation = {
                    id: `conv_${index}`,
                    title: msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : ''),
                    timestamp: msg.timestamp,
                    messages: [msg]
                };
            } else if (currentConversation) {
                // Add assistant message to current conversation
                currentConversation.messages.push(msg);
            }
        });
        
        // Add the last conversation
        if (currentConversation) {
            conversations.push(currentConversation);
        }
        
        return conversations.reverse(); // Latest first
    };

    const transformMessages = (conversationMessages) => {
        return conversationMessages.map(msg => {
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
    };

    const selectConversation = (conversation) => {
        setSelectedConversation(conversation);
        setMessages(transformMessages(conversation.messages));
        setShowHistory(false); // Hide history on mobile after selection
    };

    const startNewConversation = () => {
        setSelectedConversation(null);
        setMessages([]);
        setShowHistory(false);
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
                
                // Reload history to include new messages
                setTimeout(() => {
                    loadChatHistory();
                }, 1000);
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
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
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
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                            </svg>
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
        <div className="flex h-full">
            {/* History Sidebar */}
            <div className={`bg-gray-50 border-r border-gray-200 transition-all duration-300 ${
                showHistory ? 'w-80' : 'w-0 md:w-80'
            } overflow-hidden flex flex-col`}>
                {/* Sidebar Header */}
                <div className="p-4 border-b border-gray-300">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Chat History</h3>
                        <button
                            onClick={() => setShowHistory(false)}
                            className="md:hidden text-gray-500 hover:text-gray-700"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <button
                        onClick={startNewConversation}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center transition-colors"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Nuova Conversazione
                    </button>
                </div>

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto p-2">
                    {chatHistory.length === 0 ? (
                        <div className="text-center text-gray-500 mt-8">
                            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <p className="text-sm">Nessuna conversazione</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {chatHistory.map((conversation) => (
                                <button
                                    key={conversation.id}
                                    onClick={() => selectConversation(conversation)}
                                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                                        selectedConversation?.id === conversation.id
                                            ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                            : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
                                    }`}
                                >
                                    <div className="font-medium text-sm mb-1 truncate">{conversation.title}</div>
                                    <div className={`text-xs ${
                                        selectedConversation?.id === conversation.id 
                                            ? 'text-blue-600' 
                                            : 'text-gray-500'
                                    }`}>
                                        {new Date(conversation.timestamp).toLocaleDateString('it-IT')}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                {/* Chat Header */}
                <div className="bg-white border-b border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <button
                                onClick={() => setShowHistory(!showHistory)}
                                className="md:hidden mr-3 text-gray-600 hover:text-gray-900"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    SUK Chat
                                </h2>
                                <p className="text-sm text-gray-600 mt-1">
                                    {selectedConversation 
                                        ? `Conversazione: ${selectedConversation.title}`
                                        : 'Chiedimi informazioni su prodotti, soluzioni e fornitori'
                                    }
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={loadChatHistory}
                            className="text-gray-600 hover:text-gray-900"
                            title="Aggiorna cronologia"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0V9a8.002 8.002 0 0115.356 2M15 15v5h-.582M3.682 13A8.001 8.001 0 0019.418 15m0 0V15a8.002 8.002 0 00-15.356-2" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 && (
                        <div className="text-center text-gray-500 mt-8">
                            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <p>Inizia una nuova conversazione o seleziona una dalla cronologia</p>
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
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
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
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
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
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

window.SUKChat = SUKChat;
