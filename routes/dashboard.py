from flask import Blueprint, jsonify, current_app
from routes.auth import login_required
import logging

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/stats', methods=['GET'])
@login_required
def get_dashboard_stats():
    try:
        neo4j_service = current_app.config['neo4j_service']

        # Get company count from Neo4j
        company_count = neo4j_service.get_company_count()

        # Get sector aggregations
        sector_data = neo4j_service.get_sector_aggregations()

        # Get total sector count
        total_sector_count = neo4j_service.get_total_sector_count()

        # Get report stats from PostgreSQL
        from models import Report, db
        from sqlalchemy import func, and_
        from datetime import datetime, timedelta

        today = datetime.utcnow().date()
        reports_today = db.session.query(func.count(Report.id)).filter(
            func.date(Report.created_at) == today
        ).scalar() or 0

        # Get last update time (mock for now, could be from Neo4j metadata)
        last_update = datetime.utcnow().isoformat()

        return jsonify({
            'company_count': company_count,
            'sector_count': total_sector_count,
            'reports_today': reports_today,
            'last_update': last_update,
            'sector_distribution': sector_data
        }), 200

    except Exception as e:
        logging.error(f"Dashboard stats error: {str(e)}")
        return jsonify({'error': 'Failed to fetch dashboard statistics'}), 500

@dashboard_bp.route('/companies', methods=['GET'])
@login_required
def get_companies():
    try:
        neo4j_service = current_app.config['neo4j_service']
        companies = neo4j_service.get_companies_list()

        return jsonify({'companies': companies}), 200

    except Exception as e:
        logging.error(f"Get companies error: {str(e)}")
        return jsonify({'error': 'Failed to fetch companies'}), 500

@dashboard_bp.route('/sectors', methods=['GET'])
@login_required
def get_sectors():
    try:
        neo4j_service = current_app.config['neo4j_service']
        sectors = neo4j_service.get_sector_aggregations()

        return jsonify({'sectors': sectors}), 200

    except Exception as e:
        logging.error(f"Get sectors error: {str(e)}")
        return jsonify({'error': 'Failed to fetch sectors'}), 500

@dashboard_bp.route('/recent-reports', methods=['GET'])
@login_required
def get_recent_reports():
    try:
        from models import Report, User

        # Get recent reports with user info
        recent_reports = Report.query.join(User).add_columns(
            Report.id,
            Report.company_name,
            Report.status,
            Report.created_at,
            User.username
        ).order_by(Report.created_at.desc()).limit(10).all()

        reports_data = []
        for report in recent_reports:
            reports_data.append({
                'id': report.id,
                'company_name': report.company_name,
                'status': report.status,
                'created_at': report.created_at.isoformat() if report.created_at else None,
                'username': report.username
            })

        return jsonify({'recent_reports': reports_data}), 200

    except Exception as e:
        logging.error(f"Get recent reports error: {str(e)}")
        return jsonify({'error': 'Failed to fetch recent reports'}), 500

@dashboard_bp.route('/sector-companies', methods=['GET'])
@login_required
def get_sector_companies():
    try:
        from flask import request
        sector = request.args.get('sector')

        if not sector:
            return jsonify({'error': 'Sector parameter is required'}), 400

        neo4j_service = current_app.config['neo4j_service']
        companies = neo4j_service.get_companies_by_sector(sector)

        return jsonify({'companies': companies}), 200

    except Exception as e:
        logging.error(f"Get sector companies error: {str(e)}")
        return jsonify({'error': 'Failed to fetch sector companies'}), 500