const { useState, useEffect, useRef } = React;

const SUKChat = () => {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showHistory, setShowHistory] = useState(false);
    const [chatHistory, setChatHistory] = useState([]);
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
            const response = await apiService.getChatHistory();
            if (response.success && response.history) {
                setChatHistory(response.history);
                // Optionally load the most recent conversation into current messages
                if (response.history.length > 0) {
                    setMessages(response.history);
                }
            }
        } catch (error) {
            console.error("Failed to load chat history:", error);
        }
    };

    const clearCurrentChat = () => {
        setMessages([]);
        setError(null);
    };

    const loadHistoryIntoChat = (historyMessages) => {
        setMessages(historyMessages);
        setShowHistory(false);
        setError(null);
    };

    const sendMessage = async () => {
        if (!inputMessage.trim() || isLoading) return;

        const userMessage = {
            id: Date.now(),
            type: "user",
            content: inputMessage.trim(),
            timestamp: new Date().toISOString(),
        };

        // Add user message to chat
        setMessages((prev) => [...prev, userMessage]);
        setInputMessage("");
        setIsLoading(true);
        setError(null);

        try {
            const response = await apiService.sendChatMessage(
                userMessage.content,
                window.currentUser?.id,
            );

            if (response.success) {
                // Add assistant response to chat
                const assistantMessage = {
                    id: Date.now() + 1,
                    type: "assistant",
                    content: response,
                    timestamp: response.timestamp || new Date().toISOString(),
                    prodotti_soluzioni_esistenti:
                        response.prodotti_soluzioni_esistenti || [],
                    potenziali_fornitori: response.potenziali_fornitori || [],
                };
                setMessages((prev) => [...prev, assistantMessage]);
            } else {
                throw new Error(response.error || "Failed to send message");
            }
        } catch (error) {
            console.error("Error sending message:", error);
            setError(error.message || "Failed to send message");

            // Add error message to chat
            const errorMessage = {
                id: Date.now() + 1,
                type: "error",
                content:
                    "Sorry, I encountered an error processing your message. Please try again.",
                timestamp: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const formatAssistantResponse = (data) => {
        if (!data.prodotti_soluzioni_esistenti && !data.potenziali_fornitori) {
            return <div className="text-gray-600">No data available</div>;
        }

        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Prodotti e Soluzioni Esistenti */}
                <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                        <i data-feather="package" className="w-4 h-4 mr-2"></i>
                        Prodotti e Soluzioni Esistenti
                    </h4>
                    <div className="space-y-2">
                        {data.prodotti_soluzioni_esistenti &&
                        data.prodotti_soluzioni_esistenti.length > 0 ? (
                            data.prodotti_soluzioni_esistenti.map(
                                (item, index) => (
                                    <div
                                        key={index}
                                        className="bg-white p-3 rounded border-l-4 border-blue-400"
                                    >
                                        <h5 className="font-medium text-gray-900">
                                            {item.nome_azienda}
                                        </h5>
                                        {item.prodotto_soluzione_identificato && (
                                            <p className="text-sm font-medium text-blue-700 mt-1">
                                                {
                                                    item.prodotto_soluzione_identificato
                                                }
                                            </p>
                                        )}
                                        {item.motivo_del_match && (
                                            <p className="text-sm text-gray-600 mt-2">
                                                {item.motivo_del_match}
                                            </p>
                                        )}
                                    </div>
                                ),
                            )
                        ) : (
                            <p className="text-sm text-gray-500 italic">
                                Nessun prodotto o soluzione trovata
                            </p>
                        )}
                    </div>
                </div>

                {/* Potenziali Fornitori */}
                <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                        <i data-feather="users" className="w-4 h-4 mr-2"></i>
                        Potenziali Fornitori
                    </h4>
                    <div className="space-y-2">
                        {data.potenziali_fornitori &&
                        data.potenziali_fornitori.length > 0 ? (
                            data.potenziali_fornitori.map(
                                (fornitore, index) => (
                                    <div
                                        key={index}
                                        className="bg-white p-3 rounded border-l-4 border-green-400"
                                    >
                                        <h5 className="font-medium text-gray-900">
                                            {fornitore.nome_azienda}
                                        </h5>
                                        {fornitore.motivo_del_match && (
                                            <p className="text-sm text-gray-600 mt-2">
                                                {fornitore.motivo_del_match}
                                            </p>
                                        )}
                                    </div>
                                ),
                            )
                        ) : (
                            <p className="text-sm text-gray-500 italic">
                                Nessun fornitore potenziale trovato
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-full">
            {/* Chat History Sidebar */}
            <div
                className={`bg-gray-50 border-r border-gray-200 transition-all duration-300 ${showHistory ? "w-80" : "w-0"} overflow-hidden`}
            >
                <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <i data-feather="clock" className="w-4 h-4 mr-2"></i>
                        Cronologia Chat
                    </h3>
                </div>
                <div className="p-4 space-y-3 overflow-y-auto h-full">
                    {chatHistory.length === 0 ? (
                        <p className="text-sm text-gray-500">
                            Nessuna cronologia disponibile
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {/* Group messages by conversation sessions */}
                            {(() => {
                                const sessions = [];
                                let currentSession = [];

                                chatHistory.forEach((msg, index) => {
                                    if (msg.type === "user") {
                                        if (currentSession.length > 0) {
                                            sessions.push([...currentSession]);
                                        }
                                        currentSession = [msg];
                                    } else {
                                        currentSession.push(msg);
                                    }
                                });

                                if (currentSession.length > 0) {
                                    sessions.push(currentSession);
                                }

                                return sessions
                                    .reverse()
                                    .map((session, sessionIndex) => {
                                        const userMessage = session.find(
                                            (m) => m.type === "user",
                                        );
                                        const timestamp = userMessage
                                            ? new Date(userMessage.timestamp)
                                            : new Date();

                                        return (
                                            <div
                                                key={sessionIndex}
                                                className="bg-white p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                                                onClick={() =>
                                                    loadHistoryIntoChat(session)
                                                }
                                            >
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {userMessage
                                                        ? userMessage.content
                                                        : "Conversazione"}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {timestamp.toLocaleDateString()}{" "}
                                                    {timestamp.toLocaleTimeString()}
                                                </p>
                                            </div>
                                        );
                                    });
                            })()}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex flex-col flex-1">
                {/* Chat Header */}
                <div className="bg-white border-b border-gray-200 p-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                                <i
                                    data-feather="message-circle"
                                    className="w-5 h-5 mr-2"
                                ></i>
                                SUK Chat
                            </h2>
                            <p className="text-sm text-gray-600 mt-1">
                                Chiedimi informazioni su prodotti, soluzioni e
                                fornitori
                            </p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setShowHistory(!showHistory)}
                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                                title={
                                    showHistory
                                        ? "Nascondi cronologia"
                                        : "Mostra cronologia"
                                }
                            >
                                <i data-feather="clock" className="w-5 h-5"></i>
                            </button>
                            <button
                                onClick={clearCurrentChat}
                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Nuova conversazione"
                            >
                                <i data-feather="plus" className="w-5 h-5"></i>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 && (
                        <div className="text-center text-gray-500 mt-8">
                            <i
                                data-feather="message-circle"
                                className="w-12 h-12 mx-auto mb-4 text-gray-300"
                            ></i>
                            <p>
                                Inizia una conversazione chiedendo informazioni
                                su prodotti o fornitori
                            </p>
                        </div>
                    )}

                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`max-w-3xl px-4 py-2 rounded-lg ${
                                    message.type === "user"
                                        ? "bg-blue-600 text-white"
                                        : message.type === "error"
                                          ? "bg-red-100 text-red-800 border border-red-200"
                                          : "bg-gray-100 text-gray-900"
                                }`}
                            >
                                {message.type === "user" ? (
                                    <p>{message.content}</p>
                                ) : message.type === "error" ? (
                                    <p className="flex items-center">
                                        <i
                                            data-feather="alert-circle"
                                            className="w-4 h-4 mr-2"
                                        ></i>
                                        {message.content}
                                    </p>
                                ) : (
                                    formatAssistantResponse(message.content)
                                )}
                                <div
                                    className={`text-xs mt-2 ${message.type === "user" ? "text-blue-200" : "text-gray-500"}`}
                                >
                                    {new Date(
                                        message.timestamp,
                                    ).toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-gray-100 px-4 py-2 rounded-lg">
                                <div className="flex items-center space-x-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                    <span className="text-gray-600">
                                        Sto elaborando la tua richiesta...
                                    </span>
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
                            <i
                                data-feather="alert-circle"
                                className="w-4 h-4 mr-2"
                            ></i>
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
        </div>
    );
};

window.SUKChat = SUKChat;
