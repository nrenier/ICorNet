const { useState, useEffect } = React;

const Dashboard = ({ user, showToast }) => {
    const [stats, setStats] = useState(null);
    const [recentReports, setRecentReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [charts, setCharts] = useState({});
    const [showSectorModal, setShowSectorModal] = useState(false);
    const [selectedSector, setSelectedSector] = useState(null);
    const [sectorCompanies, setSectorCompanies] = useState([]);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);

            // Load dashboard stats
            const statsResponse = await apiService.getDashboardStats();
            setStats(statsResponse);

            // Load recent reports
            const reportsResponse = await apiService.getRecentReports();
            setRecentReports(reportsResponse.recent_reports || []);

            // Create charts after data loads
            setTimeout(() => {
                createCharts(statsResponse);
            }, 100);

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            showToast('Failed to load dashboard data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const createCharts = (dashboardStats) => {
        // Create sector distribution pie chart
        if (dashboardStats.sector_distribution && dashboardStats.sector_distribution.length > 0) {
            const sectorCtx = document.getElementById('sectorChart');
            if (sectorCtx) {
                // Destroy existing chart if it exists
                if (charts.sectorChart) {
                    charts.sectorChart.destroy();
                }

                const sectorChart = new Chart(sectorCtx, {
                    type: 'pie',
                    data: {
                        labels: dashboardStats.sector_distribution.map(s => s.settore || 'Unknown'),
                        datasets: [{
                            data: dashboardStats.sector_distribution.map(s => s.count),
                            backgroundColor: [
                                '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
                                '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6B7280'
                            ],
                            borderWidth: 2,
                            borderColor: '#FFFFFF'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        onClick: (evt, elements) => {
                            if (elements.length > 0) {
                                const chartElement = elements[0];
                                const sectorIndex = chartElement.index;
                                const sectorData = dashboardStats.sector_distribution[sectorIndex];
                                handleSectorClick(sectorData);
                            }
                        },
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    padding: 20,
                                    usePointStyle: true
                                }
                            }
                        }
                    }
                });

                setCharts(prev => ({ ...prev, sectorChart }));
            }
        }

        // Create mock trend chart (since we don't have historical data)
        const trendCtx = document.getElementById('trendChart');
        if (trendCtx) {
            // Destroy existing chart if it exists
            if (charts.trendChart) {
                charts.trendChart.destroy();
            }

            // Generate mock data for the last 7 days
            const mockTrendData = [];
            const mockLabels = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                mockLabels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
                mockTrendData.push(Math.floor(Math.random() * 10) + 1);
            }

            const trendChart = new Chart(trendCtx, {
                type: 'line',
                data: {
                    labels: mockLabels,
                    datasets: [{
                        label: 'Reports Generated',
                        data: mockTrendData,
                        borderColor: '#3B82F6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });

            setCharts(prev => ({ ...prev, trendChart }));
        }
    };

    const handleSectorClick = async (sectorData) => {
        try {
            setSelectedSector(sectorData);
            setShowSectorModal(true);

            // Load detailed companies for this sector
            const response = await apiService.getSectorCompanies(sectorData.settore);
            setSectorCompanies(response.companies || []);
        } catch (error) {
            console.error('Error loading sector companies:', error);
            showToast('Failed to load sector companies', 'error');
        }
    };

    const closeSectorModal = () => {
        setShowSectorModal(false);
        setSelectedSector(null);
        setSectorCompanies([]);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600 mt-1">
                    Welcome back, {user.first_name || user.username}! Here's your corporate data overview.
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <i data-feather="building" className="w-6 h-6 text-blue-600"></i>
                            </div>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Total Companies</p>
                            <p className="text-2xl font-semibold text-gray-900">
                                {stats?.company_count || 0}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <i data-feather="pie-chart" className="w-6 h-6 text-green-600"></i>
                            </div>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Sectors</p>
                            <p className="text-2xl font-semibold text-gray-900">
                                {stats?.sector_count || 0}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                                <i data-feather="file-text" className="w-6 h-6 text-yellow-600"></i>
                            </div>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Reports Today</p>
                            <p className="text-2xl font-semibold text-gray-900">
                                {stats?.reports_today || 0}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                <i data-feather="clock" className="w-6 h-6 text-purple-600"></i>
                            </div>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Last Update</p>
                            <p className="text-sm font-semibold text-gray-900">
                                {stats?.last_update ? new Date(stats.last_update).toLocaleTimeString() : 'N/A'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sector Distribution Chart */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Sector Distribution</h3>
                    <div className="h-64">
                        <canvas id="sectorChart"></canvas>
                    </div>
                </div>

                {/* Trend Chart */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Generation Trend</h3>
                    <div className="h-64">
                        <canvas id="trendChart"></canvas>
                    </div>
                </div>
            </div>

            {/* Recent Reports Table */}
            <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Reports</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Company
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    User
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Created
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {recentReports.length > 0 ? (
                                recentReports.map((report) => (
                                    <tr key={report.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {report.company_name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                report.status === 'completed' 
                                                    ? 'bg-green-100 text-green-800'
                                                    : report.status === 'failed'
                                                    ? 'bg-red-100 text-red-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {report.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {report.username}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {report.created_at 
                                                ? new Date(report.created_at).toLocaleDateString()
                                                : 'N/A'
                                            }
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                                        No recent reports found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
             {/* Sector Modal */}
             {showSectorModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                                            <i data-feather="pie-chart" className="w-6 h-6 text-white"></i>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold">
                                                {selectedSector?.settore}
                                            </h3>
                                            <p className="text-blue-100 text-sm mt-1">
                                                {sectorCompanies.length} aziende in questo settore
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={closeSectorModal}
                                    className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-white hover:bg-opacity-10 rounded-lg"
                                >
                                    <i data-feather="x" className="w-6 h-6"></i>
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 max-h-96 overflow-y-auto">
                            {sectorCompanies.length > 0 ? (
                                <div className="space-y-3">
                                    {sectorCompanies.map((company, index) => (
                                        <div 
                                            key={company.id || index} 
                                            className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-all duration-200 hover:border-blue-300"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-2 mb-2">
                                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                        <h4 className="font-semibold text-gray-900 text-lg">
                                                            {company.nome_azienda}
                                                        </h4>
                                                    </div>
                                                    
                                                    {/* Settori */}
                                                    <div className="flex flex-wrap gap-2 mb-3">
                                                        {Array.isArray(company.settore) ? (
                                                            company.settore.map((settore, idx) => (
                                                                <span 
                                                                    key={idx}
                                                                    className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium"
                                                                >
                                                                    {settore}
                                                                </span>
                                                            ))
                                                        ) : company.settore ? (
                                                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                                                {company.settore}
                                                            </span>
                                                        ) : null}
                                                    </div>

                                                    {/* Informazioni aggiuntive */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                                                        {company.indirizzo && (
                                                            <div className="flex items-center space-x-1">
                                                                <i data-feather="map-pin" className="w-3 h-3 text-gray-400"></i>
                                                                <span className="truncate">{company.indirizzo}</span>
                                                            </div>
                                                        )}
                                                        {company.sito_web && (
                                                            <div className="flex items-center space-x-1">
                                                                <i data-feather="globe" className="w-3 h-3 text-gray-400"></i>
                                                                <a 
                                                                    href={company.sito_web} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="text-blue-600 hover:text-blue-800 truncate"
                                                                >
                                                                    {company.sito_web.replace(/^https?:\/\//, '')}
                                                                </a>
                                                            </div>
                                                        )}
                                                        {company.TRL && (
                                                            <div className="flex items-center space-x-1">
                                                                <i data-feather="trending-up" className="w-3 h-3 text-gray-400"></i>
                                                                <span>TRL: {company.TRL}</span>
                                                            </div>
                                                        )}
                                                        {company.data_inizio_attivita && (
                                                            <div className="flex items-center space-x-1">
                                                                <i data-feather="calendar" className="w-3 h-3 text-gray-400"></i>
                                                                <span>{company.data_inizio_attivita}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Descrizione */}
                                                    {company.descrizione && (
                                                        <div className="mt-3 p-3 bg-white rounded border border-gray-100">
                                                            <p className="text-sm text-gray-700 line-clamp-2">
                                                                {company.descrizione.length > 150 
                                                                    ? company.descrizione.substring(0, 150) + '...'
                                                                    : company.descrizione
                                                                }
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Status indicator */}
                                                <div className="ml-4 flex flex-col items-center space-y-2">
                                                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                                                    <span className="text-xs text-gray-500 writing-mode-vertical">Attiva</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <i data-feather="search" className="w-8 h-8 text-gray-400"></i>
                                    </div>
                                    <h4 className="text-lg font-medium text-gray-900 mb-2">Nessuna azienda trovata</h4>
                                    <p className="text-gray-500">
                                        Non ci sono aziende registrate per il settore "{selectedSector?.settore}"
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-200">
                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                                <i data-feather="info" className="w-4 h-4"></i>
                                <span>Dati aggiornati in tempo reale</span>
                            </div>
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => {
                                        // Future: Esporta lista aziende
                                        showToast('Funzionalità di esportazione in arrivo', 'info');
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center space-x-2"
                                >
                                    <i data-feather="download" className="w-4 h-4"></i>
                                    <span>Esporta</span>
                                </button>
                                <button
                                    onClick={closeSectorModal}
                                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm"
                                >
                                    Chiudi
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Make Dashboard component globally available
window.Dashboard = Dashboard;