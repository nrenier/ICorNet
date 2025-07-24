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
                <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        {/* Background overlay, when the modal screen is open. */}
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>

                        {/* This element is to trick the browser into centering the modal contents. */}
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        {/* Modal panel */}
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                            {selectedSector?.settore} Companies
                                        </h3>
                                        <div className="mt-2">
                                            <ul>
                                                {sectorCompanies.map(company => (
                                                    <li key={company.id} className="py-2 border-b border-gray-200">
                                                        <p className="text-sm text-gray-500">
                                                            {company.nome_azienda} ({company.settore})
                                                        </p>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button type="button" className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm" onClick={closeSectorModal}>
                                    Close
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