from neo4j import GraphDatabase
import logging

class Neo4jService:
    def __init__(self, uri, username, password):
        try:
            self.driver = GraphDatabase.driver(uri, auth=(username, password))
            # Test connection
            with self.driver.session() as session:
                session.run("RETURN 1")
            logging.info("Neo4j connection established")
        except Exception as e:
            logging.error(f"Neo4j connection failed: {str(e)}")
            self.driver = None
    
    def close(self):
        if self.driver:
            self.driver.close()
    
    def get_company_count(self):
        """Get total count of companies in Neo4j"""
        if not self.driver:
            logging.warning("Neo4j driver not available, returning mock data")
            return 150
        
        try:
            with self.driver.session() as session:
                result = session.run("MATCH (n:SUK) RETURN count(n) as count")
                record = result.single()
                return record["count"] if record else 0
        except Exception as e:
            logging.error(f"Error getting company count: {str(e)}")
            return 0
    
    def get_companies_list(self):
        """Get list of all companies with their details"""
        if not self.driver:
            logging.warning("Neo4j driver not available, returning mock data")
            return [
                {"nome_azienda": "Acme Corporation", "settore": "Technology", "descrizione": "Software development company"},
                {"nome_azienda": "Beta Industries", "settore": "Manufacturing", "descrizione": "Industrial equipment manufacturer"},
                {"nome_azienda": "Gamma Solutions", "settore": "Consulting", "descrizione": "Business consulting services"},
                {"nome_azienda": "Delta Logistics", "settore": "Transportation", "descrizione": "Logistics and shipping services"},
                {"nome_azienda": "Epsilon Energy", "settore": "Energy", "descrizione": "Renewable energy solutions"}
            ]
        
        try:
            with self.driver.session() as session:
                result = session.run("""
                    MATCH (n:SUK) 
                    WHERE n.nome_azienda IS NOT NULL
                    RETURN properties(n) as company_properties
                    ORDER BY n.nome_azienda
                """)
                return [record["company_properties"] for record in result]
        except Exception as e:
            logging.error(f"Error getting companies list: {str(e)}")
            return []
    
    def get_sector_aggregations(self):
        """Get aggregated data by sector"""
        if not self.driver:
            logging.warning("Neo4j driver not available, returning mock data")
            return [
                {"settore": "Technology", "count": 45, "sample_companies": ["Acme Corporation", "TechCorp", "InnovateSoft"]},
                {"settore": "Manufacturing", "count": 38, "sample_companies": ["Beta Industries", "MegaManufacturing", "PrecisionTools"]},
                {"settore": "Consulting", "count": 27, "sample_companies": ["Gamma Solutions", "StrategicAdvisors", "BusinessPros"]},
                {"settore": "Transportation", "count": 23, "sample_companies": ["Delta Logistics", "FastShip", "GlobalTransport"]},
                {"settore": "Energy", "count": 17, "sample_companies": ["Epsilon Energy", "GreenPower", "SolarTech"]}
            ]
        
        try:
            with self.driver.session() as session:
                result = session.run("""
                    MATCH (n:SUK) 
                    WHERE n.settore IS NOT NULL
                    RETURN n.settore as settore, 
                           count(n) as count, 
                           collect(n.nome_azienda)[0..5] as sample_companies
                    ORDER BY count DESC
                """)
                return [record.data() for record in result]
        except Exception as e:
            logging.error(f"Error getting sector aggregations: {str(e)}")
            return []
    
    def get_company_details(self, company_name):
        """Get detailed information for a specific company"""
        if not self.driver:
            logging.warning("Neo4j driver not available")
            return None
        
        try:
            with self.driver.session() as session:
                result = session.run("""
                    MATCH (n:SUK) 
                    WHERE n.nome_azienda = $company_name
                    RETURN properties(n) as company_properties
                """, company_name=company_name)
                
                record = result.single()
                if record:
                    return record["company_properties"]
                return None
        except Exception as e:
            logging.error(f"Error getting company details: {str(e)}")
            return None
    
    def search_companies(self, search_term):
        """Search companies by name"""
        if not self.driver:
            logging.warning("Neo4j driver not available")
            return []
        
        try:
            with self.driver.session() as session:
                result = session.run("""
                    MATCH (n:SUK) 
                    WHERE n.nome_azienda CONTAINS $search_term
                    RETURN properties(n) as company_properties
                    ORDER BY n.nome_azienda
                    LIMIT 20
                """, search_term=search_term)
                return [record["company_properties"] for record in result]
        except Exception as e:
            logging.error(f"Error searching companies: {str(e)}")
            return []
