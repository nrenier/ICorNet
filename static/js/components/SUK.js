const { useState, useEffect } = React;

const CompanyRelationshipsGraph = ({ companyName, onRelationshipClick }) => {
    const [relationships, setRelationships] = useState({ nodes: [], edges: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (companyName) {
            loadRelationships();
        }
    }, [companyName]);

    const loadRelationships = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiService.getCompanyRelationships(companyName);
            setRelationships(response.relationships || { nodes: [], edges: [] });
        } catch (err) {
            console.error('Error loading relationships:', err);
            setError('Errore nel caricamento delle relazioni');
        } finally {
            setLoading(false);
        }
    };

    if (!companyName) return null;

    return (
        <div className="bg-teal-50 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-teal-900">Grafo delle Relazioni</h3>
                <button
                    onClick={loadRelationships}
                    disabled={loading}
                    className="text-teal-600 hover:text-teal-800 text-sm font-medium disabled:opacity-50"
                >
                    <i data-feather="refresh-cw" className="w-4 h-4 inline mr-1"></i>
                    Aggiorna
                </button>
            </div>

            {loading && (
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-2"></div>
                        <p className="text-teal-600 text-sm">Caricamento relazioni...</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            {!loading && !error && relationships.nodes.length === 0 && (
                <div className="text-center py-8 text-teal-600">
                    <i data-feather="link" className="w-12 h-12 mx-auto mb-2 text-teal-300"></i>
                    <p>Nessuna relazione trovata per questa azienda</p>
                </div>
            )}

            {!loading && !error && relationships.nodes.length > 0 && (
                <div>
                    <div 
                        id={`graph-${companyName.replace(/\s+/g, '-')}`}
                        className="w-full h-96 bg-white rounded border"
                    ></div>
                    <div className="mt-4 text-sm text-teal-700">
                        <p><strong>Legenda:</strong></p>
                        <div className="flex items-center space-x-4 mt-2">
                            <div className="flex items-center">
                                <div className="w-3 h-3 bg-blue-600 rounded-full mr-2"></div>
                                <span>Azienda selezionata</span>
                            </div>
                            <div className="flex items-center">
                                <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
                                <span>Aziende correlate</span>
                            </div>
                        </div>
                        <p className="text-xs mt-2 text-teal-600">
                            Clicca sulle linee di connessione per vedere i dettagli della relazione
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

const SUK = ({ user, showToast }) => {
    const [companies, setCompanies] = useState([]);
    const [filteredCompanies, setFilteredCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSector, setSelectedSector] = useState('');
    const [sectors, setSectors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reportHistory, setReportHistory] = useState([]);
    const [generatingReport, setGeneratingReport] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [showRelationshipModal, setShowRelationshipModal] = useState(false);
    const [selectedRelationship, setSelectedRelationship] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const response = await apiService.getCompanies();
            
            if (response.companies && Array.isArray(response.companies)) {
                setCompanies(response.companies);
                setFilteredCompanies(response.companies.slice(0, 20));
                
                // Extract unique sectors
                const uniqueSectors = new Map();
                response.companies.forEach(company => {
                    if (company.settore) {
                        if (Array.isArray(company.settore)) {
                            company.settore.forEach(sector => {
                                if (typeof sector === 'string' && sector.trim()) {
                                    const key = sector.toLowerCase();
                                    uniqueSectors.set(key, {
                                        settore: sector,
                                        count: (uniqueSectors.get(key)?.count || 0) + 1
                                    });
                                }
                            });
                        } else if (typeof company.settore === 'string' && company.settore.trim()) {
                            const key = company.settore.toLowerCase();
                            uniqueSectors.set(key, {
                                settore: company.settore,
                                count: (uniqueSectors.get(key)?.count || 0) + 1
                            });
                        }
                    }
                });
                setSectors(Array.from(uniqueSectors.values()).sort((a, b) => b.count - a.count));
            }
            
            await loadReportHistory();
        } catch (error) {
            console.error('Error loading data:', error);
            showToast('Failed to load data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadReportHistory = async () => {
        try {
            const response = await apiService.getReportHistory();
            setReportHistory(response.reports || []);
        } catch (error) {
            console.error('Error loading report history:', error);
        }
    };

    const generateReport = async () => {
        if (!selectedCompany) {
            showToast('Please select a company first', 'error');
            return;
        }
        
        try {
            setGeneratingReport(true);
            const response = await apiService.generateReport(selectedCompany.nome_azienda, user.id);
            
            if (response.report_id) {
                showToast('Report generation started! Check the history table for updates.', 'success');
                await loadReportHistory();
            }
        } catch (error) {
            console.error('Error generating report:', error);
            showToast(error.message || 'Failed to generate report', 'error');
        } finally {
            setGeneratingReport(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading SUK data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                <h1 className="text-2xl font-bold text-gray-900">SUK Analysis</h1>
                <p className="text-gray-600 mt-1">
                    Select a company and generate detailed analysis reports
                </p>
            </div>

            {/* Company Selection */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Company Selection</h2>
                    {(selectedSector || searchTerm) && (
                        <div className="text-sm text-gray-600">
                            {filteredCompanies.length} companies found
                            {filteredCompanies.length >= 20 && " (showing first 20)"}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Search and Select */}
                    <div className="lg:col-span-2">
                        <div className="space-y-4">
                            {/* Sector Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Filter by Sector (Optional)
                                </label>
                                <select
                                    value={selectedSector}
                                    onChange={(e) => setSelectedSector(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All Sectors</option>
                                    {sectors.map((sector, index) => (
                                        <option key={index} value={sector.settore}>
                                            {sector.settore} ({sector.count} companies)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Search Input */} 
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Search Company
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Type company name to search..."
                                        className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <i data-feather="search" className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2"></i>
                                </div>
                            </div>

                            {/* Company Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-left hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className={selectedCompany ? "text-gray-900" : "text-gray-500"}>
                                            {selectedCompany ? selectedCompany.nome_azienda : "Select a company..."}
                                        </span>
                                        <i data-feather={isDropdownOpen ? "chevron-up" : "chevron-down"} className="w-4 h-4 text-gray-400"></i>
                                    </div>
                                </button>

                                {isDropdownOpen && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {filteredCompanies.map((company, index) => (
                                            <button
                                                key={index}
                                                onClick={() => {
                                                    setSelectedCompany(company);
                                                    setIsDropdownOpen(false);
                                                }}
                                                className="w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                                            >
                                                <div className="font-medium text-gray-900">{company.nome_azienda}</div>
                                                {company.settore && (
                                                    <div className="text-sm text-gray-500 mt-1">
                                                        {Array.isArray(company.settore) ? company.settore.join(', ') : company.settore}
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                        {filteredCompanies.length === 0 && (
                                            <div className="px-4 py-3 text-gray-500 text-center">
                                                No companies found matching your criteria
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div>
                        <div className="space-y-3">
                            <button
                                onClick={generateReport}
                                disabled={!selectedCompany || generatingReport}
                                className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                            >
                                {generatingReport ? (
                                    <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Generating...
                                    </div>
                                ) : (
                                    <>
                                        <i data-feather="file-text" className="w-4 h-4 inline mr-2"></i>
                                        Generate Report
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Selected Company Details */}
            {selectedCompany && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-semibold text-gray-900">Company Details</h2>
                    </div>

                    <div className="space-y-6">
                        {/* Basic Info */}
                        <div className="bg-blue-50 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-blue-900 mb-4">General Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                                <div>
                                    <strong>Company Name:</strong> {selectedCompany.nome_azienda}
                                </div>
                                {selectedCompany.settore && (
                                    <div>
                                        <strong>Sector:</strong> {Array.isArray(selectedCompany.settore) 
                                            ? selectedCompany.settore.join(', ') 
                                            : selectedCompany.settore}
                                    </div>
                                )}
                                {selectedCompany.descrizione && (
                                    <div className="md:col-span-2">
                                        <strong>Description:</strong> {selectedCompany.descrizione}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Company Relationships Graph */}
                        <CompanyRelationshipsGraph 
                            companyName={selectedCompany.nome_azienda}
                            onRelationshipClick={() => {}}
                        />
                    </div>
                </div>
            )}

            {/* Report History */}
            <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900">Report History</h2>
                    <button
                        onClick={loadReportHistory}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                        <i data-feather="refresh-cw" className="w-4 h-4 inline mr-1"></i>
                        Refresh
                    </button>
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
                                    Created
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {reportHistory.length > 0 ? 
                                reportHistory.map((report) => (
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
                                            {report.created_at 
                                                ? new Date(report.created_at).toLocaleString()
                                                : 'N/A'
                                            }
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {report.status === 'completed' ? (
                                                <button className="text-blue-600 hover:text-blue-800 font-medium">
                                                    <i data-feather="download" className="w-4 h-4 inline mr-1"></i>
                                                    Download
                                                </button>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-sm text-gray-500">
                                        <div className="flex flex-col items-center">
                                            <i data-feather="file-text" className="w-8 h-8 text-gray-300 mb-2"></i>
                                            <p>No reports generated yet</p>
                                            <p className="text-xs mt-1">Select a company and generate your first report</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// Make SUK globally available
window.SUK = SUK;