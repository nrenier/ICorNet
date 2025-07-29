const { useState, useEffect } = React;

const FederterziarioCompanyRelationshipsGraph = ({
    companyName,
    onRelationshipClick,
}) => {
    const [relationships, setRelationships] = useState({
        nodes: [],
        edges: [],
    });
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
            const response =
                await apiService.getFederterziarioCompanyRelationships(
                    companyName,
                );
            setRelationships(
                response.relationships || { nodes: [], edges: [] },
            );
        } catch (err) {
            console.error("Error loading FEDERTERZIARIO relationships:", err);
            setError("Errore nel caricamento delle relazioni");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (relationships.nodes.length > 0 && !loading) {
            renderGraph();
        }
    }, [relationships, loading]);

    const renderGraph = () => {
        const container = document.getElementById(
            `federterziario-graph-${companyName.replace(/\s+/g, "-")}`,
        );
        if (!container || typeof d3 === "undefined") return;

        // Clear previous graph
        d3.select(container).selectAll("*").remove();

        const width = container.offsetWidth || 600;
        const height = 400;

        const svg = d3
            .select(container)
            .append("svg")
            .attr("width", width)
            .attr("height", height);

        const simulation = d3
            .forceSimulation(relationships.nodes)
            .force(
                "link",
                d3
                    .forceLink(relationships.edges)
                    .id((d) => d.id)
                    .distance(100),
            )
            .force("charge", d3.forceManyBody().strength(-300))
            .force("center", d3.forceCenter(width / 2, height / 2));

        // Links
        const link = svg
            .append("g")
            .selectAll("line")
            .data(relationships.edges)
            .enter()
            .append("line")
            .attr("stroke-width", (d) => Math.sqrt(d.weight || 1) * 2)
            .attr("stroke", "#999")
            .attr("opacity", 0.6);

        // Nodes
        const node = svg
            .append("g")
            .selectAll("circle")
            .data(relationships.nodes)
            .enter()
            .append("circle")
            .attr("r", (d) => (d.type === "center" ? 12 : 8))
            .attr("fill", (d) => (d.type === "center" ? "#dc2626" : "#94a3b8"))
            .call(
                d3
                    .drag()
                    .on("start", dragstarted)
                    .on("drag", dragged)
                    .on("end", dragended),
            );

        // Labels
        const label = svg
            .append("g")
            .selectAll("text")
            .data(relationships.nodes)
            .enter()
            .append("text")
            .text((d) => d.name)
            .attr("font-size", "10px")
            .attr("text-anchor", "middle")
            .attr("dy", -15);

        // Add click handler for edges
        link.on("click", (event, d) => {
            if (onRelationshipClick) {
                const relationship = {
                    source: {
                        properties: { nome_azienda: d.source.name || d.source },
                    },
                    target: {
                        properties: { nome_azienda: d.target.name || d.target },
                    },
                    relationship: { properties: d.properties || {} },
                };
                onRelationshipClick(relationship);
            }
        }).style("cursor", "pointer");

        simulation.nodes(relationships.nodes).on("tick", ticked);

        simulation.force("link").links(relationships.edges);

        function ticked() {
            link.attr("x1", (d) => d.source.x)
                .attr("y1", (d) => d.source.y)
                .attr("x2", (d) => d.target.x)
                .attr("y2", (d) => d.target.y);

            node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);

            label.attr("x", (d) => d.x).attr("y", (d) => d.y);
        }

        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }
    };

    if (!companyName) return null;

    return (
        <div className="bg-red-50 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-red-900">
                    Grafo delle Relazioni FEDERTERZIARIO
                </h3>
                <button
                    onClick={loadRelationships}
                    disabled={loading}
                    className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                >
                    <svg
                        className="w-4 h-4 inline mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                    </svg>
                    Aggiorna
                </button>
            </div>

            {loading && (
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
                        <p className="text-red-600 text-sm">
                            Caricamento relazioni...
                        </p>
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            {!loading && !error && relationships.nodes.length === 0 && (
                <div className="text-center py-8 text-red-600">
                    <svg
                        className="w-12 h-12 mx-auto mb-2 text-red-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                        ></path>
                    </svg>
                    <p>Nessuna relazione trovata per questa azienda</p>
                </div>
            )}

            {!loading && !error && relationships.nodes.length > 0 && (
                <div>
                    <div
                        id={`federterziario-graph-${companyName.replace(/\s+/g, "-")}`}
                        className="w-full h-96 bg-white rounded border"
                    ></div>
                    <div className="mt-4 text-sm text-red-700">
                        <p>
                            <strong>Legenda:</strong>
                        </p>
                        <div className="flex items-center space-x-4 mt-2">
                            <div className="flex items-center">
                                <div className="w-3 h-3 bg-red-600 rounded-full mr-2"></div>
                                <span>Azienda selezionata</span>
                            </div>
                            <div className="flex items-center">
                                <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
                                <span>Aziende correlate</span>
                            </div>
                        </div>
                        <p className="text-xs mt-2 text-red-600">
                            Clicca sulle linee di connessione per vedere i
                            dettagli della relazione
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

const FEDERTERZIARIO = ({ user, showToast }) => {
    const [companies, setCompanies] = useState([]);
    const [filteredCompanies, setFilteredCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [reportHistory, setReportHistory] = useState([]);
    const [generatingReport, setGeneratingReport] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [selectedReports, setSelectedReports] = useState([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingReports, setDeletingReports] = useState(false);
    const [showRelationshipModal, setShowRelationshipModal] = useState(false);
    const [selectedRelationship, setSelectedRelationship] = useState(null);
    const mountedRef = React.useRef(true);

    useEffect(() => {
        loadData();

        // Cleanup function to mark component as unmounted
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        // Filter companies based on search term
        if (searchTerm.trim() === "") {
            setFilteredCompanies(companies.slice(0, 20)); // Show first 20 companies
        } else {
            const filtered = companies
                .filter((company) => {
                    const nameMatch = company.nome_azienda
                        ?.toLowerCase()
                        .includes(searchTerm.toLowerCase());
                    const settoreMatch = company.settore
                        ?.toLowerCase()
                        .includes(searchTerm.toLowerCase());
                    const classificazioneMatch = company.classificazione_prodotti
                        ? Array.isArray(company.classificazione_prodotti)
                            ? company.classificazione_prodotti.some(c => 
                                c?.toLowerCase().includes(searchTerm.toLowerCase())
                              )
                            : company.classificazione_prodotti.toLowerCase().includes(searchTerm.toLowerCase())
                        : false;
                    return nameMatch || settoreMatch || classificazioneMatch;
                })
                .slice(0, 20);
            setFilteredCompanies(filtered);
        }
    }, [searchTerm, companies]);

    // Safe state update utility
    const safeSetState = (setter, value) => {
        if (mountedRef.current) {
            setter(value);
        }
    };

    const loadData = async () => {
        try {
            safeSetState(setLoading, true);

            // Load FEDERTERZIARIO companies from Neo4j
            const companiesResponse =
                await apiService.getFederterziarioCompaniesForReports();
            safeSetState(setCompanies, companiesResponse.companies || []);

            // Load user's report history (FEDERTERZIARIO only)
            const historyResponse =
                await apiService.getReportHistory("federterziario");
            safeSetState(setReportHistory, historyResponse.reports || []);
        } catch (error) {
            console.error("Error loading FEDERTERZIARIO data:", error);
            if (mountedRef.current) {
                showToast("Failed to load company data", "error");
            }
        } finally {
            safeSetState(setLoading, false);
        }
    };

    const handleCompanySelect = async (company) => {
        setSelectedCompany(company);
        setSearchTerm(company.nome_azienda);
        setIsDropdownOpen(false);

        // Load detailed company information
        try {
            const detailsResponse =
                await apiService.getFederterziarioCompanyDetails(
                    company.nome_azienda,
                );
            setSelectedCompany(detailsResponse.company);
        } catch (error) {
            console.error("Error loading company details:", error);
            // Keep the basic company info if detailed loading fails
        }
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setIsDropdownOpen(true);

        // Clear selected company if search is cleared
        if (e.target.value.trim() === "") {
            setSelectedCompany(null);
        }
    };

    const generateReport = async () => {
        if (!selectedCompany) {
            showToast("Please select a company first", "error");
            return;
        }

        try {
            setGeneratingReport(true);

            const response = await apiService.generateReport(
                selectedCompany.nome_azienda,
                "federterziario",
            );
            showToast(
                "Report generation started! Check the history section for updates.",
                "success",
            );

            // Reload report history to show the new report
            setTimeout(() => {
                loadReportHistory();
            }, 1000);
        } catch (error) {
            console.error("Error generating report:", error);
            showToast("Failed to generate report", "error");
        } finally {
            setGeneratingReport(false);
        }
    };

    const generateFiliereReport = async () => {
        try {
            setGeneratingReport(true);

            const response = await apiService.generateReport(
                "FEDERTERZIARIO_FILIERA", // Special company name for filiera reports
                "federterziario_filiera",
            );
            showToast(
                "Report Filiera generation started! Check the history section for updates.",
                "success",
            );

            // Reload report history to show the new report
            setTimeout(() => {
                loadReportHistory();
            }, 1000);
        } catch (error) {
            console.error("Error generating filiera report:", error);
            showToast("Failed to generate filiera report", "error");
        } finally {
            setGeneratingReport(false);
        }
    };

    const loadReportHistory = async () => {
        try {
            const historyResponse =
                await apiService.getReportHistory("federterziario");
            setReportHistory(historyResponse.reports || []);
        } catch (error) {
            console.error("Error loading report history:", error);
        }
    };

    const downloadReport = async (reportId) => {
        try {
            await apiService.downloadReport(reportId);
            showToast("Download completed", "success");
        } catch (error) {
            console.error("Error downloading report:", error);
            showToast("Failed to download report", "error");
        }
    };

    const viewReport = async (reportId) => {
        try {
            await apiService.viewReport(reportId);
            showToast("Opening report in new tab", "success");
        } catch (error) {
            console.error("Error viewing report:", error);
            showToast("Failed to view report", "error");
        }
    };

    const refreshReportStatus = async (reportId) => {
        try {
            const response = await apiService.getReportStatus(reportId);

            // Update the report in history
            setReportHistory((prev) =>
                prev.map((report) =>
                    report.id === reportId
                        ? {
                              ...report,
                              status: response.status,
                              file_name: response.file_name,
                          }
                        : report,
                ),
            );
        } catch (error) {
            console.error("Error refreshing report status:", error);
        }
    };

    const toggleReportSelection = (reportId) => {
        setSelectedReports((prev) =>
            prev.includes(reportId)
                ? prev.filter((id) => id !== reportId)
                : [...prev, reportId],
        );
    };

    const toggleSelectAllReports = () => {
        if (selectedReports.length === reportHistory.length) {
            setSelectedReports([]);
        } else {
            setSelectedReports(reportHistory.map((report) => report.id));
        }
    };

    const openDeleteModal = () => {
        if (selectedReports.length === 0) {
            showToast("Please select reports to delete", "error");
            return;
        }
        setShowDeleteModal(true);
    };

    const closeDeleteModal = () => {
        setShowDeleteModal(false);
    };

    const confirmBulkDelete = async () => {
        try {
            safeSetState(setDeletingReports, true);
            const reportsToDelete = [...selectedReports]; // Create a copy

            await apiService.bulkDeleteReports(reportsToDelete);

            // Update state in the correct order to prevent React errors
            safeSetState(setSelectedReports, []);
            safeSetState(setShowDeleteModal, false);

            // Remove deleted reports from local state
            safeSetState(setReportHistory, (prev) =>
                prev.filter((report) => !reportsToDelete.includes(report.id)),
            );

            if (mountedRef.current) {
                showToast(
                    `Successfully deleted ${reportsToDelete.length} report(s)`,
                    "success",
                );
            }
        } catch (error) {
            console.error("Error deleting reports:", error);
            if (mountedRef.current) {
                showToast("Failed to delete reports", "error");
            }
            safeSetState(setShowDeleteModal, false);
        } finally {
            safeSetState(setDeletingReports, false);
        }
    };

    const openRelationshipModal = (relationship) => {
        setSelectedRelationship({
            source: relationship.source.properties.nome_azienda,
            target: relationship.target.properties.nome_azienda,
            properties: relationship.relationship.properties,
        });
        setShowRelationshipModal(true);
    };

    const closeRelationshipModal = () => {
        setShowRelationshipModal(false);
        setSelectedRelationship(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">
                        Loading FEDERTERZIARIO data...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="mb-2">
                    <h1 className="text-2xl font-bold text-gray-900">
                        FEDERTERZIARIO Analysis
                    </h1>
                </div>
                <p className="text-gray-600 mt-1">
                    Select a company and generate detailed FEDERTERZIARIO
                    analysis reports
                </p>
            </div>

            {/* Filiera Report Section */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg shadow-sm p-6 text-white">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold mb-2">
                            Report Filiera FEDERTERZIARIO
                        </h2>
                        <p className="text-purple-100">
                            Genera un report completo dell'intera filiera FEDERTERZIARIO
                        </p>
                    </div>
                    <button
                        onClick={generateFiliereReport}
                        disabled={generatingReport}
                        className="bg-white text-purple-600 px-6 py-3 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-purple-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
                    >
                        {generatingReport ? (
                            <div className="flex items-center">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600 mr-2"></div>
                                Generando...
                            </div>
                        ) : (
                            <span className="flex items-center">
                                <svg
                                    className="w-5 h-5 mr-2"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    ></path>
                                </svg>
                                Genera Report Filiera
                            </span>
                        )}
                    </button>
                </div>
                <div className="mt-4 text-sm text-purple-100">
                    <div className="flex items-center">
                        <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            ></path>
                        </svg>
                        Nome file: Federterziario_filiera_{new Date().toISOString().slice(0, 10).replace(/-/g, '')}.pdf
                    </div>
                </div>
            </div>

            {/* Company Selection */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Company Selection
                </h2>

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
                                    <svg
                                        className="w-5 h-5 text-gray-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                        ></path>
                                    </svg>
                                </div>
                            </div>

                            {/* Dropdown */}
                            {isDropdownOpen && filteredCompanies.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    {filteredCompanies.map((company, index) => (
                                        <button
                                            key={index}
                                            onClick={() =>
                                                handleCompanySelect(company)
                                            }
                                            className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                                        >
                                            <div className="font-medium text-gray-900">
                                                {company.nome_azienda}
                                            </div>
                                            {(company.settore ||
                                                company.classificazione_prodotti) && (
                                                <div className="text-sm text-gray-500">
                                                    {company.settore &&
                                                        `Settore: ${company.settore}`}
                                                    {company.settore &&
                                                        company.classificazione_prodotti &&
                                                        " | "}
                                                    {company.classificazione_prodotti &&
                                                        `Classificazione: ${Array.isArray(company.classificazione_prodotti) ? company.classificazione_prodotti.join(', ') : company.classificazione_prodotti}`}
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {searchTerm &&
                            !selectedCompany &&
                            filteredCompanies.length === 0 && (
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
                                    <svg
                                        className="w-4 h-4 mr-2"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M4 6h16M4 10h16M4 14h16M4 18h16"
                                        ></path>
                                    </svg>
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
                            <h3 className="text-lg font-semibold text-blue-900 mb-4">
                                Informazioni Generali
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                                {selectedCompany.nome_azienda && (
                                    <div>
                                        <strong>Nome Azienda:</strong>{" "}
                                        {selectedCompany.nome_azienda}
                                    </div>
                                )}
                                {selectedCompany.partita_iva && (
                                    <div>
                                        <strong>Partita IVA:</strong>{" "}
                                        {selectedCompany.partita_iva}
                                    </div>
                                )}
                                {selectedCompany.regione && (
                                    <div>
                                        <strong>Regione:</strong>{" "}
                                        {selectedCompany.regione}
                                    </div>
                                )}
                                {selectedCompany.sigla_provincia && (
                                    <div>
                                        <strong>Provincia:</strong>{" "}
                                        {selectedCompany.sigla_provincia}
                                    </div>
                                )}
                                {selectedCompany.sito_web && (
                                    <div>
                                        <strong>Sito Web:</strong>
                                        <a
                                            href={selectedCompany.sito_web}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800 ml-1"
                                        >
                                            {selectedCompany.sito_web}
                                        </a>
                                    </div>
                                )}
                                {selectedCompany.alto_valore_tecnologico && (
                                    <div>
                                        <strong>
                                            Alto Valore Tecnologico:
                                        </strong>{" "}
                                        {
                                            selectedCompany.alto_valore_tecnologico
                                        }
                                    </div>
                                )}
                            </div>
                            {selectedCompany.descrizione && (
                                <div className="mt-4">
                                    <strong className="block text-blue-900 mb-2">
                                        Descrizione:
                                    </strong>
                                    <p className="text-blue-800">
                                        {selectedCompany.descrizione}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Settore e Attività */}
                        <div className="bg-green-50 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-green-900 mb-4">
                                Settore e Attività
                            </h3>
                            <div className="space-y-4 text-sm text-green-800">
                                {selectedCompany.sezione_ateco && (
                                    <div>
                                        <strong>Sezione ATECO:</strong>{" "}
                                        {selectedCompany.sezione_ateco}
                                    </div>
                                )}
                                {selectedCompany.descrizione_ateco && (
                                    <div>
                                        <strong>Descrizione ATECO:</strong>{" "}
                                        {selectedCompany.descrizione_ateco}
                                    </div>
                                )}
                                {selectedCompany.tipologia_attivita &&
                                    selectedCompany.tipologia_attivita.length >
                                        0 && (
                                        <div>
                                            <strong className="block mb-2">
                                                Tipologia Attività:
                                            </strong>
                                            <ul className="list-disc list-inside space-y-1">
                                                {selectedCompany.tipologia_attivita.map(
                                                    (attivita, index) => (
                                                        <li key={index}>
                                                            {attivita}
                                                        </li>
                                                    ),
                                                )}
                                            </ul>
                                        </div>
                                    )}
                                {selectedCompany.classificazione_prodotti &&
                                    selectedCompany.classificazione_prodotti
                                        .length > 0 && (
                                        <div>
                                            <strong className="block mb-2">
                                                Classificazione Prodotti:
                                            </strong>
                                            <ul className="list-disc list-inside space-y-1">
                                                {selectedCompany.classificazione_prodotti.map(
                                                    (prodotto, index) => (
                                                        <li key={index}>
                                                            {prodotto}
                                                        </li>
                                                    ),
                                                )}
                                            </ul>
                                        </div>
                                    )}
                            </div>
                        </div>

                        {/* Informazioni Economiche e Produzione */}
                        {(selectedCompany.classe_valore_produzione ||
                            selectedCompany.tipo_mercato) && (
                            <div className="bg-yellow-50 rounded-lg p-6">
                                <h3 className="text-lg font-semibold text-yellow-900 mb-4">
                                    Informazioni Economiche
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-yellow-800">
                                    {selectedCompany.classe_valore_produzione && (
                                        <div>
                                            <strong>
                                                Classe Valore Produzione:
                                            </strong>{" "}
                                            {
                                                selectedCompany.classe_valore_produzione
                                            }
                                        </div>
                                    )}
                                    {selectedCompany.tipo_mercato &&
                                        selectedCompany.tipo_mercato.length >
                                            0 && (
                                            <div>
                                                <strong>Tipo Mercato:</strong>{" "}
                                                {selectedCompany.tipo_mercato.join(
                                                    ", ",
                                                )}
                                            </div>
                                        )}
                                </div>
                            </div>
                        )}

                        {/* Date Importanti */}
                        {selectedCompany.data_inizio_attivita && (
                            <div className="bg-purple-50 rounded-lg p-6">
                                <h3 className="text-lg font-semibold text-purple-900 mb-4">
                                    Date Importanti
                                </h3>
                                <div className="text-sm text-purple-800">
                                    <strong>Data Inizio Attività:</strong>{" "}
                                    {selectedCompany.data_inizio_attivita}
                                </div>
                            </div>
                        )}

                        {/* Partner e Relazioni */}
                        <div className="bg-indigo-50 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-indigo-900 mb-4">
                                Partner e Relazioni
                            </h3>
                            <div className="space-y-4 text-sm text-indigo-800">
                                {selectedCompany.potenziali_partner &&
                                    selectedCompany.potenziali_partner.length >
                                        0 && (
                                        <div>
                                            <strong className="block mb-2">
                                                Potenziali Partner:
                                            </strong>
                                            <ul className="list-disc list-inside space-y-1">
                                                {selectedCompany.potenziali_partner.map(
                                                    (partner, index) => (
                                                        <li key={index}>
                                                            {partner}
                                                        </li>
                                                    ),
                                                )}
                                            </ul>
                                        </div>
                                    )}
                                {selectedCompany.potenziali_clienti &&
                                    selectedCompany.potenziali_clienti.length >
                                        0 && (
                                        <div>
                                            <strong className="block mb-2">
                                                Potenziali Clienti:
                                            </strong>
                                            <ul className="list-disc list-inside space-y-1">
                                                {selectedCompany.potenziali_clienti.map(
                                                    (cliente, index) => (
                                                        <li key={index}>
                                                            {cliente}
                                                        </li>
                                                    ),
                                                )}
                                            </ul>
                                        </div>
                                    )}
                                {selectedCompany.investitori &&
                                    selectedCompany.investitori.length > 0 && (
                                        <div>
                                            <strong className="block mb-2">
                                                Investitori:
                                            </strong>
                                            <ul className="list-disc list-inside space-y-1">
                                                {selectedCompany.investitori.map(
                                                    (investitore, index) => (
                                                        <li key={index}>
                                                            {investitore}
                                                        </li>
                                                    ),
                                                )}
                                            </ul>
                                        </div>
                                    )}
                                {selectedCompany.aziende_controllate &&
                                    selectedCompany.aziende_controllate.length >
                                        0 && (
                                        <div>
                                            <strong className="block mb-2">
                                                Aziende Controllate:
                                            </strong>
                                            <ul className="list-disc list-inside space-y-1">
                                                {selectedCompany.aziende_controllate.map(
                                                    (controllata, index) => (
                                                        <li key={index}>
                                                            {controllata}
                                                        </li>
                                                    ),
                                                )}
                                            </ul>
                                        </div>
                                    )}
                            </div>
                        </div>

                        {/* Notizie Correlate */}
                        {selectedCompany.notizie_correlate &&
                            selectedCompany.notizie_correlate.length > 0 && (
                                <div className="bg-gray-50 rounded-lg p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                        Notizie Correlate
                                    </h3>
                                    <div className="space-y-2 text-sm text-gray-800">
                                        {selectedCompany.notizie_correlate.map(
                                            (notizia, index) => (
                                                <div
                                                    key={index}
                                                    className="border-l-4 border-gray-300 pl-3"
                                                >
                                                    {notizia}
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </div>
                            )}

                        {/* Fonti */}
                        {selectedCompany.fonti &&
                            selectedCompany.fonti.length > 0 && (
                                <div className="bg-orange-50 rounded-lg p-6">
                                    <h3 className="text-lg font-semibold text-orange-900 mb-4">
                                        Fonti
                                    </h3>
                                    <div className="space-y-2 text-sm text-orange-800">
                                        {selectedCompany.fonti.map(
                                            (fonte, index) => (
                                                <div key={index}>
                                                    <a
                                                        href={fonte}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-orange-600 hover:text-orange-800 break-all"
                                                    >
                                                        {fonte}
                                                    </a>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </div>
                            )}

                        {/* Grafo delle Relazioni */}
                        <FederterziarioCompanyRelationshipsGraph
                            companyName={selectedCompany.nome_azienda}
                            onRelationshipClick={openRelationshipModal}
                        />
                    </div>
                )}
            </div>

            {/* Report History */}
            <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Report History
                        </h2>
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
                                <svg
                                    className="w-4 h-4 mr-1"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M3 6h18M19 9l-2 2m-2 2l-2 2m-2-2l-2-2m-2 2l-2 2M7 21h10a2 2 0 002-2V9a2 2 0 00-2-2h-1.937m-2.383 0l-3.76 3.76A1.5 1.5 0 015.15 8.55L12 15.4"
                                    ></path>
                                </svg>
                                Delete Selected ({selectedReports.length})
                            </button>
                        )}
                        <button
                            onClick={loadReportHistory}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                            <svg
                                className="w-4 h-4 inline mr-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <polyline points="23 4 23 10 17 10"></polyline>
                                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                            </svg>
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
                                            checked={
                                                reportHistory.length > 0 &&
                                                selectedReports.length ===
                                                    reportHistory.length
                                            }
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
                                    <tr
                                        key={report.id}
                                        className={`hover:bg-gray-50 ${selectedReports.includes(report.id) ? "bg-blue-50" : ""}`}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <input
                                                type="checkbox"
                                                checked={selectedReports.includes(
                                                    report.id,
                                                )}
                                                onChange={() =>
                                                    toggleReportSelection(
                                                        report.id,
                                                    )
                                                }
                                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {report.company_name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <span
                                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                        report.status ===
                                                        "completed"
                                                            ? "bg-green-100 text-green-800"
                                                            : report.status ===
                                                                "failed"
                                                              ? "bg-red-100 text-red-800"
                                                              : "bg-yellow-100 text-yellow-800"
                                                    }`}
                                                >
                                                    {report.status}
                                                </span>
                                                {report.status ===
                                                    "pending" && (
                                                    <button
                                                        onClick={() =>
                                                            refreshReportStatus(
                                                                report.id,
                                                            )
                                                        }
                                                        className="ml-2 text-gray-400 hover:text-gray-600"
                                                        title="Refresh status"
                                                    >
                                                        <svg
                                                            className="w-3 h-3"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <polyline points="23 4 23 10 17 10"></polyline>
                                                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {report.created_at
                                                ? new Date(
                                                      report.created_at,
                                                  ).toLocaleString()
                                                : "N/A"}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {report.status === "completed" ? (
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() =>
                                                            viewReport(
                                                                report.id,
                                                            )
                                                        }
                                                        className="text-green-600 hover:text-green-800 font-medium"
                                                        title="View PDF"
                                                    >
                                                        <svg
                                                            className="w-4 h-4 inline mr-1"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth="2"
                                                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                                            ></path>
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth="2"
                                                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7 1.274 4.057 1.274 8.057 0 12.114-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7-1.274-4.057-1.274-8.057 0-12.114z"
                                                            ></path>
                                                        </svg>
                                                        View
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            downloadReport(
                                                                report.id,
                                                            )
                                                        }
                                                        className="text-blue-600 hover:text-blue-800 font-medium"
                                                        title="Download PDF"
                                                    >
                                                        <svg
                                                            className="w-4 h-4 inline mr-1"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth="2"
                                                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-5l-4 4-4-4m-4-5l4 4 4-4m7 4v7m-4-7v7"
                                                            ></path>
                                                        </svg>
                                                        Download
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">
                                                    -
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan="5"
                                        className="px-6 py-8 text-center text-sm text-gray-500"
                                    >
                                        <div className="flex flex-col items-center">
                                            <svg
                                                className="w-8 h-8 text-gray-300 mb-2"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="2"
                                                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                                                ></path>
                                            </svg>
                                            <p>No reports generated yet</p>
                                            <p className="text-xs mt-1">
                                                Select a company and generate
                                                your first report
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Relationship Details Modal */}
            {showRelationshipModal && selectedRelationship && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-t-xl">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-bold">
                                        Dettagli Relazione FEDERTERZIARIO
                                    </h3>
                                    <p className="text-red-100 text-sm mt-1">
                                        Analisi delle connessioni aziendali
                                    </p>
                                </div>
                                <button
                                    onClick={closeRelationshipModal}
                                    className="text-white hover:text-gray-200 transition-colors"
                                >
                                    <svg
                                        className="w-6 h-6"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M6 18L18 6M6 6l12 12"
                                        ></path>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Companies Connection */}
                            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col items-center">
                                        <div className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold text-center min-w-[120px]">
                                            {selectedRelationship.source}
                                        </div>
                                        <span className="text-xs text-gray-500 mt-1">
                                            Azienda Origine
                                        </span>
                                    </div>

                                    <div className="flex flex-col items-center mx-4">
                                        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                                            {selectedRelationship.properties
                                                ?.type || "Relazione"}
                                        </div>
                                        <svg
                                            className="w-6 h-6 text-gray-400 mt-2"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M9 5l7 7-7 7"
                                            ></path>
                                        </svg>
                                    </div>

                                    <div className="flex flex-col items-center">
                                        <div className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold text-center min-w-[120px]">
                                            {selectedRelationship.target}
                                        </div>
                                        <span className="text-xs text-gray-500 mt-1">
                                            Azienda Destinazione
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Relationship Type */}
                            {selectedRelationship.properties?.type && (
                                <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
                                    <div className="flex items-center">
                                        <svg
                                            className="w-5 h-5 text-green-600 mr-2"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                                            ></path>
                                        </svg>
                                        <h4 className="text-lg font-semibold text-green-800">
                                            Tipologia Relazione
                                        </h4>
                                    </div>
                                    <p className="text-green-700 mt-2 font-medium capitalize">
                                        {selectedRelationship.properties.type}
                                    </p>
                                </div>
                            )}

                            {/* Relationship Properties */}
                            {selectedRelationship.properties &&
                                Object.keys(selectedRelationship.properties)
                                    .length > 0 && (
                                    <div>
                                        <div className="flex items-center mb-4">
                                            <svg
                                                className="w-5 h-5 text-red-600 mr-2"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="2"
                                                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                ></path>
                                            </svg>
                                            <h4 className="text-lg font-semibold text-gray-900">
                                                Dettagli Aggiuntivi
                                            </h4>
                                        </div>

                                        <div className="grid gap-4">
                                            {Object.entries(
                                                selectedRelationship.properties,
                                            ).map(([key, value]) => {
                                                if (key === "type") return null; // Già mostrato sopra

                                                return (
                                                    <div
                                                        key={key}
                                                        className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1">
                                                                <h5 className="font-medium text-gray-900 capitalize mb-1">
                                                                    {key.replace(
                                                                        /_/g,
                                                                        " ",
                                                                    )}
                                                                </h5>
                                                                <div className="text-gray-700 text-sm leading-relaxed">
                                                                    {key ===
                                                                    "weight" ? (
                                                                        <div className="flex items-center">
                                                                            <div className="flex space-x-1 mr-2">
                                                                                {[
                                                                                    ...Array(
                                                                                        5,
                                                                                    ),
                                                                                ].map(
                                                                                    (
                                                                                        _,
                                                                                        i,
                                                                                    ) => (
                                                                                        <svg
                                                                                            key={
                                                                                                i
                                                                                            }
                                                                                            className={`w-4 h-4 ${i < parseInt(value) ? "text-yellow-400 fill-current" : "text-gray-300"}`}
                                                                                            viewBox="0 0 24 24"
                                                                                            fill="currentColor"
                                                                                        >
                                                                                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 5.19 8.63L-7.19.61L5.46 9.24 3.82 13.97 18.18 21z"></path>
                                                                                        </svg>
                                                                                    ),
                                                                                )}
                                                                            </div>
                                                                            <span className="font-medium">
                                                                                {
                                                                                    value
                                                                                }
                                                                                /5
                                                                            </span>
                                                                        </div>
                                                                    ) : (
                                                                        <span>
                                                                            {String(
                                                                                value,
                                                                            )}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {key ===
                                                                "weight" && (
                                                                <div className="ml-4">
                                                                    <span
                                                                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                                            parseInt(
                                                                                value,
                                                                            ) >=
                                                                            4
                                                                                ? "bg-green-100 text-green-800"
                                                                                : parseInt(
                                                                                        value,
                                                                                    ) >=
                                                                                    3
                                                                                  ? "bg-yellow-100 text-yellow-800"
                                                                                  : "bg-red-100 text-red-800"
                                                                        }`}
                                                                    >
                                                                        {parseInt(
                                                                            value,
                                                                        ) >= 4
                                                                            ? "Forte"
                                                                            : parseInt(
                                                                                    value,
                                                                                ) >=
                                                                                3
                                                                              ? "Media"
                                                                              : "Debole"}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                        </div>

                        {/* Footer */}
                        <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-end space-x-3">
                            <button
                                onClick={closeRelationshipModal}
                                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                            >
                                Chiudi
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                        {/* Header */}
                        <div className="bg-red-600 text-white p-6 rounded-t-xl">
                            <div className="flex items-center">
                                <svg
                                    className="w-6 h-6 mr-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M3 6h18M19 9l-2 2m-2 2l-2 2m-2-2l-2-2m-2 2l-2 2M7 21h10a2 2 0 002-2V9a2 2 0 00-2-2h-1.937m-2.383 0l-3.76 3.76A1.5 1.5 0 015.15 8.55L12 15.4"
                                    ></path>
                                </svg>
                                <h3 className="text-xl font-bold">
                                    Conferma Eliminazione
                                </h3>
                            </div>
                        </div>

                        <div className="p-6">
                            <p className="text-gray-700 mb-4">
                                Sei sicuro di voler eliminare{" "}
                                <strong>{selectedReports.length}</strong> report
                                {selectedReports.length > 1 ? "s" : ""}?
                            </p>
                            <p className="text-sm text-gray-500 mb-6">
                                Questa azione non può essere annullata. I file
                                PDF associati verranno eliminati
                                definitivamente.
                            </p>

                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                                <div className="flex items-start">
                                    <svg
                                        className="w-5 h-5 text-yellow-600 mr-2 mt-0.5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                        ></path>
                                    </svg>
                                    <div>
                                        <h4 className="text-sm font-medium text-yellow-800">
                                            Attenzione
                                        </h4>
                                        <p className="text-sm text-yellow-700 mt-1">
                                            I report selezionati e i relativi
                                            file verranno eliminati
                                            permanentemente.
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
                                        <svg
                                            className="w-4 h-4 mr-2"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M3 6h18M19 9l-2 2m-2 2l-2 2m-2-2l-2-2m-2 2l-2 2M7 21h10a2 2 0 002-2V9a2 2 0 00-2-2h-1.937m-2.383 0l-3.76 3.76A1.5 1.5 0 015.15 8.55L12 15.4"
                                            ></path>
                                        </svg>
                                        Elimina {selectedReports.length} Report
                                        {selectedReports.length > 1 ? "s" : ""}
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
