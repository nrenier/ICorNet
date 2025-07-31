const { useState, useEffect, useRef } = React;

const STARTUPChat = ({ user }) => {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [chatHistory, setChatHistory] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [showHistory, setShowHistory] = useState(false);
    const [regions, setRegions] = useState([]);
    const [provinces, setProvinces] = useState([]);
    const [selectedRegion, setSelectedRegion] = useState('');
    const [selectedProvince, setSelectedProvince] = useState('');
    const [loadingRegions, setLoadingRegions] = useState(false);
    const [loadingProvinces, setLoadingProvinces] = useState(false);
    const messagesEndRef = useRef(null);

    // Scroll to bottom when new messages are added
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Load chat history and regions on component mount
    useEffect(() => {
        loadChatHistory();
        loadRegions();
    }, []);

    // Load provinces when region changes
    useEffect(() => {
        if (selectedRegion) {
            loadProvinces(selectedRegion);
        } else {
            setProvinces([]);
            setSelectedProvince('');
        }
    }, [selectedRegion]);

    const loadRegions = async () => {
        try {
            setLoadingRegions(true);
            const response = await apiService.getStartupRegions();
            if (response.success && response.regions) {
                setRegions(response.regions);
            }
        } catch (error) {
            console.error('Failed to load regions:', error);
        } finally {
            setLoadingRegions(false);
        }
    };

    const loadProvinces = async (region) => {
        try {
            setLoadingProvinces(true);
            const response = await apiService.getStartupProvinces(region);
            if (response.success && response.provinces) {
                setProvinces(response.provinces);
            }
        } catch (error) {
            console.error('Failed to load provinces:', error);
        } finally {
            setLoadingProvinces(false);
        }
    };

    const loadChatHistory = async () => {
        try {
            const userId = user?.id || 
                          user?.user_id || 
                          window.currentUser?.id || 
                          window.currentUser?.user_id || 
                          localStorage.getItem('currentUserId') || 
                          'anonymous';
            console.log('Loading STARTUP chat history for user:', userId);
            const response = await apiService.getStartupChatHistory(userId);
            console.log('STARTUP Chat history response:', response);
            console.log('Response.history type:', typeof response.history);
            console.log('Response.history is array:', Array.isArray(response.history));
            console.log('Response.history length:', response.history?.length);
            
            if (response.success && response.history) {
                console.log('Processing history data...');
                console.log('Raw history data:', JSON.stringify(response.history, null, 2));
                
                const conversations = groupMessagesIntoConversations(response.history);
                console.log('Grouped conversations:', conversations);
                console.log('Number of conversations:', conversations.length);
                
                setChatHistory(conversations);

                if (conversations.length > 0 && !selectedConversation) {
                    console.log('Setting first conversation as selected');
                    setSelectedConversation(conversations[0]);
                    setMessages(transformMessages(conversations[0].messages));
                }
            } else {
                console.log('No valid history data found');
            }
        } catch (error) {
            console.error('Failed to load STARTUP chat history:', error);
        }
    };

    const groupMessagesIntoConversations = (history) => {
        console.log('groupMessagesIntoConversations called with:', history);
        
        if (!history || !Array.isArray(history)) {
            console.log('History is not a valid array');
            return [];
        }
        
        if (history.length === 0) {
            console.log('History array is empty');
            return [];
        }

        // Count message types for debugging
        const userMessages = history.filter(msg => msg.message_type === 'user');
        const assistantMessages = history.filter(msg => msg.message_type === 'assistant');
        console.log(`DEBUG: Found ${userMessages.length} user messages and ${assistantMessages.length} assistant messages`);

        const conversations = [];
        let currentConversation = null;

        // If we only have assistant messages, create artificial conversations
        if (userMessages.length === 0 && assistantMessages.length > 0) {
            console.log('DEBUG: Only assistant messages found, creating artificial conversations');
            assistantMessages.forEach((msg, index) => {
                const conversation = {
                    id: `conv_artificial_${index}_${Date.now()}`,
                    title: `Conversazione ${index + 1}`,
                    timestamp: msg.timestamp,
                    messages: [
                        {
                            content: 'Conversazione ripristinata dalla cronologia',
                            message_type: 'user',
                            timestamp: msg.timestamp
                        },
                        msg
                    ]
                };
                conversations.push(conversation);
                console.log('Created artificial conversation:', conversation);
            });
        } else {
            // Normal grouping logic
            history.forEach((msg, index) => {
                console.log(`Processing message ${index}:`, msg);
                console.log(`Message type: ${msg.message_type}, Content length: ${msg.content?.length || 0}`);
                
                if (msg.message_type === 'user') {
                    if (currentConversation) {
                        console.log('Pushing current conversation:', currentConversation);
                        conversations.push(currentConversation);
                    }
                    
                    const title = msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : '');
                    console.log('Creating new conversation with title:', title);
                    
                    currentConversation = {
                        id: `conv_${index}_${Date.now()}`,
                        title: title,
                        timestamp: msg.timestamp,
                        messages: [msg]
                    };
                } else if (currentConversation && msg.message_type === 'assistant') {
                    console.log('Adding assistant message to current conversation');
                    currentConversation.messages.push(msg);
                } else {
                    console.log('Skipping message - no current conversation or unknown type:', msg.message_type);
                }
            });

            if (currentConversation) {
                console.log('Pushing final conversation:', currentConversation);
                conversations.push(currentConversation);
            }
        }

        console.log('Total conversations created:', conversations.length);
        console.log('Final conversations:', conversations);
        
        return conversations.reverse();
    };

    const transformMessages = (conversationMessages) => {
        console.log('transformMessages called with:', conversationMessages);
        
        if (!conversationMessages || !Array.isArray(conversationMessages)) {
            console.log('Invalid conversation messages');
            return [];
        }
        
        return conversationMessages.map((msg, index) => {
            console.log(`Transforming message ${index}:`, msg);
            let content = msg.content;

            if (msg.message_type === 'assistant' && typeof content === 'string') {
                try {
                    content = JSON.parse(content);
                    console.log('Parsed assistant content:', content);
                } catch (e) {
                    console.error('Failed to parse assistant message content:', e);
                }
            }

            const transformedMessage = {
                id: `${msg.timestamp}-${Math.random()}`,
                type: msg.message_type,
                content: content,
                timestamp: msg.timestamp
            };
            
            console.log('Transformed message:', transformedMessage);
            return transformedMessage;
        });
    };

    const selectConversation = (conversation) => {
        setSelectedConversation(conversation);
        setMessages(transformMessages(conversation.messages));
        setShowHistory(false);
    };

    const startNewConversation = () => {
        setSelectedConversation(null);
        setMessages([]);
        setShowHistory(false);
    };

    const deleteConversation = async (conversation) => {
        if (!confirm('Sei sicuro di voler eliminare questa conversazione?')) {
            return;
        }

        try {
            const userId = user?.id || 
                          user?.user_id || 
                          window.currentUser?.id || 
                          window.currentUser?.user_id || 
                          localStorage.getItem('currentUserId') || 
                          'anonymous';
            const startTimestamp = conversation.messages[0].timestamp;
            const endTimestamp = conversation.messages[conversation.messages.length - 1].timestamp;

            const response = await apiService.deleteStartupConversation(userId, startTimestamp, endTimestamp);

            if (response.success) {
                setChatHistory(prev => prev.filter(conv => conv.id !== conversation.id));

                if (selectedConversation?.id === conversation.id) {
                    setSelectedConversation(null);
                    setMessages([]);
                }

                console.log(`Conversazione STARTUP eliminata: ${response.deleted_count} messaggi`);
            }
        } catch (error) {
            console.error('Errore nell\'eliminazione della conversazione STARTUP:', error);
            alert('Errore nell\'eliminazione della conversazione');
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

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);
        setError(null);

        try {
            const userId = user?.id || 
                          user?.user_id || 
                          window.currentUser?.id || 
                          window.currentUser?.user_id || 
                          localStorage.getItem('currentUserId') || 
                          'anonymous';
            const response = await apiService.sendStartupChatMessage(
                userMessage.content, 
                userId,
                selectedRegion,
                selectedProvince
            );

            if (response && (response.prodotti_soluzioni_esistenti || response.potenziali_fornitori)) {
                const assistantMessage = {
                    id: Date.now() + 1,
                    type: 'assistant',
                    content: response,
                    timestamp: response.timestamp || new Date().toISOString()
                };
                setMessages(prev => [...prev, assistantMessage]);

                setTimeout(() => {
                    loadChatHistory();
                }, 1000);
            } else {
                throw new Error(response.error || 'Failed to send message');
            }
        } catch (error) {
            console.error('Error sending STARTUP message:', error);
            setError(error.message || 'Failed to send message');

            const errorMessage = {
                id: Date.now() + 1,
                type: 'error',
                content: 'Mi dispiace, ho riscontrato un errore nell\'elaborazione del tuo messaggio. Riprova.',
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

    const handleCompanyClick = (companyName) => {
        sessionStorage.setItem('selectedCompanyForSTARTUP', companyName);

        window.dispatchEvent(new CustomEvent('startupCompanySelected', { 
            detail: { companyName } 
        }));

        if (window.switchToTab) {
            window.switchToTab('startup');
        }
    };

    const formatAssistantResponse = (data) => {
        if (!data.prodotti_soluzioni_esistenti && !data.potenziali_fornitori) {
            return <div className="text-gray-600">Nessun dato disponibile</div>;
        }

        return (
            <div className="space-y-4">
                {/* Prodotti e Soluzioni Esistenti */}
                {data.prodotti_soluzioni_esistenti && data.prodotti_soluzioni_esistenti.length > 0 && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-blue-800 mb-3 flex items-center justify-between">
                            <div className="flex items-center">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                                Prodotti e Soluzioni Esistenti
                            </div>
                            <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                                Top {Math.min(data.prodotti_soluzioni_esistenti.length, 10)} risultati
                            </span>
                        </h4>
                        <div className="space-y-2">
                            {data.prodotti_soluzioni_esistenti.map((item, index) => (
                                <div key={index} className="bg-white p-3 rounded border-l-4 border-blue-400">
                                    <div className="flex justify-between items-start mb-2">
                                        <button
                                            onClick={() => handleCompanyClick(item.nome_azienda)}
                                            className="font-medium text-blue-600 hover:text-blue-800 hover:underline flex-1 text-left transition-colors cursor-pointer"
                                            title="Clicca per aprire in STARTUP Analysis"
                                        >
                                            {item.nome_azienda}
                                            <svg className="w-3 h-3 inline ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                        </button>
                                        {item.ranking && (
                                            <div className="flex items-center ml-2">
                                                <svg className="w-4 h-4 text-yellow-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                                </svg>
                                                <span className="text-sm font-semibold text-gray-700">{parseFloat(item.ranking).toFixed(1)}</span>
                                            </div>
                                        )}
                                    </div>
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
                        <h4 className="font-semibold text-green-800 mb-3 flex items-center justify-between">
                            <div className="flex items-center">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                </svg>
                                Potenziali Fornitori
                            </div>
                            <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">
                                Top {Math.min(data.potenziali_fornitori.length, 10)} risultati
                            </span>
                        </h4>
                        <div className="space-y-2">
                            {data.potenziali_fornitori.map((fornitore, index) => (
                                <div key={index} className="bg-white p-3 rounded border-l-4 border-green-400">
                                    <div className="flex justify-between items-start mb-2">
                                        <button
                                            onClick={() => handleCompanyClick(fornitore.nome_azienda)}
                                            className="font-medium text-green-600 hover:text-green-800 hover:underline flex-1 text-left transition-colors cursor-pointer"
                                            title="Clicca per aprire in STARTUP Analysis"
                                        >
                                            {fornitore.nome_azienda}
                                            <svg className="w-3 h-3 inline ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                        </button>
                                        {fornitore.ranking && (
                                            <div className="flex items-center ml-2">
                                                <svg className="w-4 h-4 text-yellow-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                                </svg>
                                                <span className="text-sm font-semibold text-gray-700">{parseFloat(fornitore.ranking).toFixed(1)}</span>
                                            </div>
                                        )}
                                    </div>
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
                        <h3 className="text-lg font-semibold text-gray-900">STARTUP Chat History</h3>
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
                            <p className="text-xs mt-2">Debug: Controlla la console</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {chatHistory.map((conversation) => (
                                <div key={conversation.id} className="relative group">
                                    <button
                                        onClick={() => selectConversation(conversation)}
                                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                                            selectedConversation?.id === conversation.id
                                                ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                                : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
                                        }`}
                                    >
                                        <div className="font-medium text-sm mb-1 truncate pr-8">{conversation.title}</div>
                                        <div className={`text-xs ${
                                            selectedConversation?.id === conversation.id 
                                                ? 'text-blue-600' 
                                                : 'text-gray-500'
                                        }`}>
                                            {new Date(conversation.timestamp).toLocaleDateString('it-IT')}
                                        </div>
                                    </button>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteConversation(conversation);
                                        }}
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 p-1"
                                        title="Elimina conversazione"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                {/* Chat Header */}
                <div className="bg-white border-b border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-4">
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
                                    STARTUP Chat
                                </h2>
                                <p className="text-sm text-gray-600 mt-1">
                                    {selectedConversation 
                                        ? `Conversazione: ${selectedConversation.title}`
                                        : 'Chiedimi informazioni su startup, prodotti e soluzioni'
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
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0V9a8.002 8.002 0 0015.356 2M15 15v5h-.582M3.682 13A8.001 8.001 0 0019.418 15m0 0V15a8.002 8.002 0 00-15.356-2" />
                            </svg>
                        </button>
                    </div>

                    {/* Geographic Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Filtra per Regione
                            </label>
                            <select
                                value={selectedRegion}
                                onChange={(e) => {
                                    setSelectedRegion(e.target.value);
                                    setSelectedProvince('');
                                }}
                                disabled={loadingRegions}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                            >
                                <option value="">Tutte le regioni</option>
                                {regions.map((region, index) => (
                                    <option key={index} value={region.REGIONE}>
                                        {region.REGIONE} ({region.COUNT})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Filtra per Provincia
                            </label>
                            <select
                                value={selectedProvince}
                                onChange={(e) => setSelectedProvince(e.target.value)}
                                disabled={!selectedRegion || loadingProvinces}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                            >
                                <option value="">Tutte le province</option>
                                {provinces.map((province, index) => (
                                    <option key={index} value={province.PROVINCIA}>
                                        {province.PROVINCIA} ({province.COUNT})
                                    </option>
                                ))}
                            </select>
                        </div>
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
                            {(selectedRegion || selectedProvince) && (
                                <p className="text-sm mt-2">
                                    Filtri attivi: {selectedRegion && `Regione: ${selectedRegion}`} {selectedProvince && `, Provincia: ${selectedProvince}`}
                                </p>
                            )}
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

window.STARTUPChat = STARTUPChat;