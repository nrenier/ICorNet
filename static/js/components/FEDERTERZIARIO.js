
const { useState, useEffect } = React;

const FEDERTERZIARIO = ({ user, showToast }) => {
    const [companies, setCompanies] = useState([]);
    const [filteredCompanies, setFilteredCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [reportHistory, setReportHistory] = useState([]);
    const [generatingReport, setGeneratingReport] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [selectedReports, setSelectedReports] = useState([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingReports, setDeletingReports] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        // Filter companies based on search term
        if (searchTerm.trim() === '') {
            setFilteredCompanies(companies.slice(0, 20)); // Show first 20 companies
        } else {
            const filtered = companies.filter(company => {
                const nameMatch = company.nome_azienda?.toLowerCase().includes(searchTerm.toLowerCase());
                const settoreMatch = company.settore?.toLowerCase().includes(searchTerm.toLowerCase());
                const regioneMatch = company.regione?.toLowerCase().includes(searchTerm.toLowerCase());
                return nameMatch || settoreMatch || regioneMatch;
            }).slice(0, 20);
            setFilteredCompanies(filtered);
        }
    }, [searchTerm, companies]);

    const loadData = async () => {
        try {
            setLoading(true);

            // Load companies from Neo4j
            const companiesResponse = await apiService.getCompaniesForReports();
            setCompanies(companiesResponse.companies || []);

            // Load user's report history
            const historyResponse = await apiService.getReportHistory();
            setReportHistory(historyResponse.reports || []);

        } catch (error) {
            console.error('Error loading FEDERTERZIARIO data:', error);
            showToast('Failed to load company data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCompanySelect = (company) => {
        setSelectedCompany(company);
        setSearchTerm(company.nome_azienda);
        setIsDropdownOpen(false);
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setIsDropdownOpen(true);

        // Clear selected company if search is cleared
        if (e.target.value.trim() === '') {
            setSelectedCompany(null);
        }
    };

    const generateReport = async () => {
        if (!selectedCompany) {
            showToast('Please select a company first', 'error');
            return;
        }

        try {
            setGeneratingReport(true);

            const response = await apiService.generateReport(selectedCompany.nome_azienda, 'federterziario');
            showToast('Report generation started! Check the history section for updates.', 'success');

            // Reload report history to show the new report
            setTimeout(() => {
                loadReportHistory();
            }, 1000);

        } catch (error) {
            console.error('Error generating report:', error);
            showToast('Failed to generate report', 'error');
        } finally {
            setGeneratingReport(false);
        }
    };

    const loadReportHistory = async () => {
        try {
            const historyResponse = await apiService.getReportHistory();
            setReportHistory(historyResponse.reports || []);
        } catch (error) {
            console.error('Error loading report history:', error);
        }
    };

    const downloadReport = async (reportId) => {
        try {
            await apiService.downloadReport(reportId);
            showToast('Download completed', 'success');
        } catch (error) {
            console.error('Error downloading report:', error);
            showToast('Failed to download report', 'error');
        }
    };

    const viewReport = async (reportId) => {
        try {
            await apiService.viewReport(reportId);
            showToast('Opening report in new tab', 'success');
        } catch (error) {
            console.error('Error viewing report:', error);
            showToast('Failed to view report', 'error');
        }
    };

    const refreshReportStatus = async (reportId) => {
        try {
            const response = await apiService.getReportStatus(reportId);

            // Update the report in history
            setReportHistory(prev => 
                prev.map(report => 
                    report.id === reportId 
                        ? { ...report, status: response.status, file_name: response.file_name }
                        : report
                )
            );

        } catch (error) {
            console.error('Error refreshing report status:', error);
        }
    };

    const toggleReportSelection = (reportId) => {
        setSelectedReports(prev => 
            prev.includes(reportId)
                ? prev.filter(id => id !== reportId)
                : [...prev, reportId]
        );
    };

    const toggleSelectAllReports = () => {
        if (selectedReports.length === reportHistory.length) {
            setSelectedReports([]);
        } else {
            setSelectedReports(reportHistory.map(report => report.id));
        }
    };

    const openDeleteModal = () => {
        if (selectedReports.length === 0) {
            showToast('Please select reports to delete', 'error');
            return;
        }
        setShowDeleteModal(true);
    };

    const closeDeleteModal = () => {
        setShowDeleteModal(false);
    };

    const confirmBulkDelete = async () => {
        try {
            setDeletingReports(true);

            await apiService.bulkDeleteReports(selectedReports);

            // Remove deleted reports from local state
            setReportHistory(prev => 
                prev.filter(report => !selectedReports.includes(report.id))
            );

            setSelectedReports([]);
            setShowDeleteModal(false);

            showToast(`Successfully deleted ${selectedReports.length} report(s)`, 'success');

        } catch (error) {
            console.error('Error deleting reports:', error);
            showToast('Failed to delete reports', 'error');
        } finally {
            setDeletingReports(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading FEDERTERZIARIO data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="mb-2">
                    <h1 className="text-2xl font-bold text-gray-900">FEDERTERZIARIO Analysis</h1>
                </div>
                <p className="text-gray-600 mt-1">
                    Select a company and generate detailed FEDERTERZIARIO analysis reports
                </p>
            </div>

            {/* Company Selection */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Selection</h2>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Search and Select */}
                    <div className="lg:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Search and Select Company
                        </label>

                        <div className="relative">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                    onFocus={() => setIsDropdownOpen(true)}
                                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Type to search companies..."
                                />
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                    <i data-feather="search" className="w-5 h-5 text-gray-400"></i>
                                </div>
                            </div>

                            {/* Dropdown */}
                            {isDropdownOpen && filteredCompanies.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    {filteredCompanies.map((company, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleCompanySelect(company)}
                                            className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                                        >
                                            <div className="font-medium text-gray-900">
                                                {company.nome_azienda}
                                            </div>
                                            {(company.settore || company.regione) && (
                                                <div className="text-sm text-gray-500">
                                                    {company.settore && `Settore: ${company.settore}`}
                                                    {company.settore && company.regione && ' | '}
                                                    {company.regione && `Regione: ${company.regione}`}
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {searchTerm && !selectedCompany && filteredCompanies.length === 0 && (
                            <p className="mt-2 text-sm text-gray-500">
                                No companies found matching your search.
                            </p>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-end space-x-3">
                        <button
                            onClick={generateReport}
                            disabled={!selectedCompany || generatingReport}
                            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {generatingReport ? (
                                <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Generating...
                                </div>
                            ) : (
                                <span className="flex items-center justify-center">
                                    <i data-feather="file-text" className="w-4 h-4 mr-2"></i>
                                    Generate Report
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Detailed Company Information */}
                {selectedCompany && (
                    <div className="mt-6 space-y-6">
                        {/* Informazioni Generali */}
                        <div className="bg-blue-50 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-blue-900 mb-4">Informazioni Generali</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                                {selectedCompany.nome_azienda && (
                                    <div>
                                        <strong>Nome Azienda:</strong> {selectedCompany.nome_azienda}
                                    </div>
                                )}
                                {selectedCompany.codice_fiscale && (
                                    <div>
                                        <strong>Codice Fiscale:</strong> {selectedCompany.codice_fiscale}
                                    </div>
                                )}
                                {selectedCompany.regione && (
                                    <div>
                                        <strong>Regione:</strong> {selectedCompany.regione}
                                    </div>
                                )}
                                {selectedCompany.comune && (
                                    <div>
                                        <strong>Comune:</strong> {selectedCompany.comune}
                                    </div>
                                )}
                                {selectedCompany.cap && (
                                    <div>
                                        <strong>CAP:</strong> {selectedCompany.cap}
                                    </div>
                                )}
                                {selectedCompany.indirizzo && (
                                    <div>
                                        <strong>Indirizzo:</strong> {selectedCompany.indirizzo}
                                    </div>
                                )}
                                {selectedCompany.natura_giuridica && (
                                    <div>
                                        <strong>Natura Giuridica:</strong> {selectedCompany.natura_giuridica}
                                    </div>
                                )}
                                {selectedCompany.stato_attivita && (
                                    <div>
                                        <strong>Stato Attività:</strong> {selectedCompany.stato_attivita}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Settore e Attività */}
                        <div className="bg-green-50 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-green-900 mb-4">Settore e Attività</h3>
                            <div className="space-y-4 text-sm text-green-800">
                                {selectedCompany.settore && (
                                    <div>
                                        <strong>Settore:</strong> {selectedCompany.settore}
                                    </div>
                                )}
                                {selectedCompany.codice_ateco_2007_principale && (
                                    <div>
                                        <strong>Codice ATECO 2007 Principale:</strong> {selectedCompany.codice_ateco_2007_principale}
                                    </div>
                                )}
                                {selectedCompany.descrizione_ateco_2007_principale && (
                                    <div>
                                        <strong>Descrizione ATECO 2007:</strong> {selectedCompany.descrizione_ateco_2007_principale}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Informazioni Economiche */}
                        {(selectedCompany.fascia_fatturato || selectedCompany.numero_dipendenti || selectedCompany.fascia_addetti) && (
                            <div className="bg-yellow-50 rounded-lg p-6">
                                <h3 className="text-lg font-semibold text-yellow-900 mb-4">Informazioni Economiche</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-yellow-800">
                                    {selectedCompany.fascia_fatturato && (
                                        <div>
                                            <strong>Fascia Fatturato:</strong> {selectedCompany.fascia_fatturato}
                                        </div>
                                    )}
                                    {selectedCompany.numero_dipendenti && (
                                        <div>
                                            <strong>Numero Dipendenti:</strong> {selectedCompany.numero_dipendenti}
                                        </div>
                                    )}
                                    {selectedCompany.fascia_addetti && (
                                        <div>
                                            <strong>Fascia Addetti:</strong> {selectedCompany.fascia_addetti}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Date Importanti */}
                        {(selectedCompany.data_costituzione || selectedCompany.data_inizio_attivita || selectedCompany.data_cessazione || selectedCompany.data_ultima_variazione) && (
                            <div className="bg-purple-50 rounded-lg p-6">
                                <h3 className="text-lg font-semibold text-purple-900 mb-4">Date Importanti</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-purple-800">
                                    {selectedCompany.data_costituzione && (
                                        <div>
                                            <strong>Data Costituzione:</strong> {selectedCompany.data_costituzione}
                                        </div>
                                    )}
                                    {selectedCompany.data_inizio_attivita && (
                                        <div>
                                            <strong>Data Inizio Attività:</strong> {selectedCompany.data_inizio_attivita}
                                        </div>
                                    )}
                                    {selectedCompany.data_cessazione && (
                                        <div>
                                            <strong>Data Cessazione:</strong> {selectedCompany.data_cessazione}
                                        </div>
                                    )}
                                    {selectedCompany.data_ultima_variazione && (
                                        <div>
                                            <strong>Data Ultima Variazione:</strong> {selectedCompany.data_ultima_variazione}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Codici e Identificativi */}
                        {(selectedCompany.cciaa && (
                            <div className="bg-indigo-50 rounded-lg p-6">
                                <h3 className="text-lg font-semibold text-indigo-900 mb-4">Codici e Identificativi</h3>
                                <div className="text-sm text-indigo-800">
                                    <strong>CCIAA:</strong> {selectedCompany.cciaa}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Report History */}
            <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <h2 className="text-lg font-semibold text-gray-900">Report History</h2>
                        {selectedReports.length > 0 && (
                            <span className="text-sm text-gray-600">
                                {selectedReports.length} selected
                            </span>
                        )}
                    </div>
                    <div className="flex items-center space-x-3">
                        {selectedReports.length > 0 && (
                            <button
                                onClick={openDeleteModal}
                                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium flex items-center"
                            >
                                <i data-feather="trash-2" className="w-4 h-4 mr-1"></i>
                                Delete Selected ({selectedReports.length})
                            </button>
                        )}
                        <button
                            onClick={loadReportHistory}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                            <i data-feather="refresh-cw" className="w-4 h-4 inline mr-1"></i>
                            Refresh
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={reportHistory.length > 0 && selectedReports.length === reportHistory.length}
                                            onChange={toggleSelectAllReports}
                                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <span className="ml-2">Select</span>
                                    </div>
                                </th>
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
                            {reportHistory.length > 0 ? (
                                reportHistory.map((report) => (
                                    <tr key={report.id} className={`hover:bg-gray-50 ${selectedReports.includes(report.id) ? 'bg-blue-50' : ''}`}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <input
                                                type="checkbox"
                                                checked={selectedReports.includes(report.id)}
                                                onChange={() => toggleReportSelection(report.id)}
                                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {report.company_name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    report.status === 'completed' 
                                                        ? 'bg-green-100 text-green-800'
                                                        : report.status === 'failed'
                                                        ? 'bg-red-100 text-red-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {report.status}
                                                </span>
                                                {report.status === 'pending' && (
                                                    <button
                                                        onClick={() => refreshReportStatus(report.id)}
                                                        className="ml-2 text-gray-400 hover:text-gray-600"
                                                        title="Refresh status"
                                                    >
                                                        <i data-feather="refresh-cw" className="w-3 h-3"></i>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {report.created_at 
                                                ? new Date(report.created_at).toLocaleString()
                                                : 'N/A'
                                            }
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {report.status === 'completed' ? (
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => viewReport(report.id)}
                                                        className="text-green-600 hover:text-green-800 font-medium"
                                                        title="View PDF"
                                                    >
                                                        <i data-feather="eye" className="w-4 h-4 inline mr-1"></i>
                                                        View
                                                    </button>
                                                    <button
                                                        onClick={() => downloadReport(report.id)}
                                                        className="text-blue-600 hover:text-blue-800 font-medium"
                                                        title="Download PDF"
                                                    >
                                                        <i data-feather="download" className="w-4 h-4 inline mr-1"></i>
                                                        Download
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-sm text-gray-500">
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

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                        {/* Header */}
                        <div className="bg-red-600 text-white p-6 rounded-t-xl">
                            <div className="flex items-center">
                                <i data-feather="trash-2" className="w-6 h-6 mr-3"></i>
                                <h3 className="text-xl font-bold">Conferma Eliminazione</h3>
                            </div>
                        </div>

                        <div className="p-6">
                            <p className="text-gray-700 mb-4">
                                Sei sicuro di voler eliminare <strong>{selectedReports.length}</strong> report{selectedReports.length > 1 ? 's' : ''}?
                            </p>
                            <p className="text-sm text-gray-500 mb-6">
                                Questa azione non può essere annullata. I file PDF associati verranno eliminati definitivamente.
                            </p>

                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                                <div className="flex items-start">
                                    <i data-feather="alert-triangle" className="w-5 h-5 text-yellow-600 mr-2 mt-0.5"></i>
                                    <div>
                                        <h4 className="text-sm font-medium text-yellow-800">Attenzione</h4>
                                        <p className="text-sm text-yellow-700 mt-1">
                                            I report selezionati e i relativi file verranno eliminati permanentemente.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-end space-x-3">
                            <button
                                onClick={closeDeleteModal}
                                disabled={deletingReports}
                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium disabled:opacity-50"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={confirmBulkDelete}
                                disabled={deletingReports}
                                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center"
                            >
                                {deletingReports ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Eliminando...
                                    </>
                                ) : (
                                    <>
                                        <i data-feather="trash-2" className="w-4 h-4 mr-2"></i>
                                        Elimina {selectedReports.length} Report{selectedReports.length > 1 ? 's' : ''}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Make FEDERTERZIARIO component globally available
window.FEDERTERZIARIO = FEDERTERZIARIO;
