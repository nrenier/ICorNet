const { useState, useEffect, createElement } = React;

// Toast notification component
const Toast = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const bgColor = type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-blue-500';
    
    return (
        <div className={`fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300`}>
            <div className="flex items-center justify-between">
                <span>{message}</span>
                <button onClick={onClose} className="ml-4 text-white hover:text-gray-200">
                    <i data-feather="x" className="w-4 h-4"></i>
                </button>
            </div>
        </div>
    );
};

// Navigation Sidebar Component
const Sidebar = ({ currentPage, onNavigate, user, onLogout }) => {
    const menuItems = [
        { id: 'dashboard', name: 'Dashboard', icon: 'home' },
        { id: 'suk', name: 'SUK Analysis', icon: 'bar-chart-2' },
    ];

    return (
        <div className="bg-white shadow-lg h-screen w-64 fixed left-0 top-0 z-40">
            <div className="p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3 mb-2">
                    <img 
                        src="/images/logo_icornet.png" 
                        alt="ICorNet Logo" 
                        className="h-8 w-8 object-contain"
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                        }}
                    />
                    <div 
                        className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center hidden"
                    >
                        <i data-feather="database" className="h-5 w-5 text-white"></i>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">ICorNet</h1>
                </div>
                <p className="text-sm text-gray-600">Intelligent Corporate Network</p>
            </div>
            
            <nav className="mt-6">
                {menuItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        className={`w-full flex items-center px-6 py-3 text-left hover:bg-gray-50 transition-colors ${
                            currentPage === item.id ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' : 'text-gray-700'
                        }`}
                    >
                        <i data-feather={item.icon} className="w-5 h-5 mr-3"></i>
                        {item.name}
                    </button>
                ))}
            </nav>
            
            <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200">
                <div className="flex items-center mb-4">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-semibold">
                            {user?.username?.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm font-medium text-gray-700">{user?.username}</p>
                        <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                    </div>
                </div>
                <button
                    onClick={onLogout}
                    className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                    <i data-feather="log-out" className="w-4 h-4 mr-2"></i>
                    Logout
                </button>
            </div>
        </div>
    );
};

// Main App Component
const App = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
    };

    const hideToast = () => {
        setToast(null);
    };

    // Check authentication on app load
    useEffect(() => {
        checkAuth();
    }, []);

    // Initialize feather icons when app loads
    useEffect(() => {
        const initIcons = () => {
            if (typeof window.initFeatherIcons === 'function') {
                window.initFeatherIcons();
            }
        };
        
        initIcons();
        // Also re-initialize periodically to catch any missed icons
        const interval = setInterval(initIcons, 1000);
        
        // Clean up interval after 10 seconds
        setTimeout(() => clearInterval(interval), 10000);
        
        return () => clearInterval(interval);
    }, [user, currentPage]);

    const checkAuth = async () => {
        try {
            const userData = await apiService.getCurrentUser();
            setUser(userData.user);
        } catch (error) {
            console.log('Not authenticated');
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (credentials) => {
        try {
            const response = await apiService.login(credentials);
            setUser(response.user);
            showToast('Login successful!', 'success');
            return true;
        } catch (error) {
            showToast(error.message || 'Login failed', 'error');
            return false;
        }
    };

    const handleRegister = async (userData) => {
        try {
            const response = await apiService.register(userData);
            setUser(response.user);
            showToast('Registration successful!', 'success');
            return true;
        } catch (error) {
            showToast(error.message || 'Registration failed', 'error');
            return false;
        }
    };

    const handleLogout = async () => {
        try {
            await apiService.logout();
            setUser(null);
            setCurrentPage('dashboard');
            showToast('Logged out successfully', 'success');
        } catch (error) {
            showToast('Logout failed', 'error');
        }
    };

    const handleNavigate = (page) => {
        setCurrentPage(page);
        // Update feather icons after navigation
        setTimeout(() => {
            if (typeof window.initFeatherIcons === 'function') {
                window.initFeatherIcons();
            } else if (typeof feather !== 'undefined') {
                try {
                    feather.replace();
                } catch (e) {
                    console.warn('Feather icons update failed:', e);
                }
            }
        }, 100);
    };

    // Show loading spinner
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading ICorNet...</p>
                </div>
            </div>
        );
    }

    // Show auth page if not logged in
    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Auth onLogin={handleLogin} onRegister={handleRegister} />
                {toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={hideToast}
                    />
                )}
            </div>
        );
    }

    // Render current page component
    const renderCurrentPage = () => {
        switch (currentPage) {
            case 'dashboard':
                return <Dashboard user={user} showToast={showToast} />;
            case 'suk':
                return <SUK user={user} showToast={showToast} />;
            default:
                return <Dashboard user={user} showToast={showToast} />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Sidebar
                currentPage={currentPage}
                onNavigate={handleNavigate}
                user={user}
                onLogout={handleLogout}
            />
            
            <div className="ml-64 min-h-screen">
                <main className="p-6">
                    {renderCurrentPage()}
                </main>
            </div>

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={hideToast}
                />
            )}
        </div>
    );
};

// Render the app
ReactDOM.render(<App />, document.getElementById('root'));
