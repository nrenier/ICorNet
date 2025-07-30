from flask import Blueprint, request, jsonify, session, current_app, send_file
from routes.auth import login_required
from models import db, Report, User
import logging
import os
import requests
from datetime import datetime

reports_bp = Blueprint('reports', __name__)


@reports_bp.route('/generate', methods=['POST'])
@login_required
def generate_report():
    try:
        data = request.get_json()

        if not data or not data.get('company_name'):
            return jsonify({'error': 'Company name is required'}), 400

        user_id = session['user_id']
        company_name = data['company_name']
        report_type = data.get('type', 'suk')  # Default to 'suk' for backward compatibility

        # Create report record
        new_report = Report()
        new_report.user_id = user_id
        new_report.company_name = company_name
        new_report.report_type = report_type
        new_report.status = 'pending'

        db.session.add(new_report)
        db.session.commit()

        # Call n8n webhook using environment variable
        webhook_url = current_app.config.get('N8N_REPORT_WEBHOOK_URL', 'http://host.docker.internal:5678/webhook/baf08e2e-8b5b-414e-bde2-109cec9b60ab')
        webhook_payload = {
            "nome_azienda": company_name,
            "type": report_type
        }

        try:
            webhook_response = requests.post(
                webhook_url,
                json=webhook_payload,
                timeout=300,
                headers={'Content-Type': 'application/json'})

            if webhook_response.status_code == 200:
                # Check if response is binary PDF
                content_type = webhook_response.headers.get('content-type', '')
                if 'application/pdf' in content_type:
                    # Direct PDF response - file is ready
                    # Save the file
                    if report_type == 'federterziario_filiera':
                        current_date = datetime.now().strftime('%Y%m%d')
                        file_name = f"Federterziario_filiera_{current_date}.pdf"
                    else:
                        clean_company_name = company_name.replace(' ', '_').replace('/', '_').replace('\\', '_')
                        current_date_extended = datetime.now().strftime('%Y%m%d%H%M')
                        file_name = f"{clean_company_name}_{current_date_extended}.pdf"
                    file_path = os.path.join('reports', file_name)

                    with open(file_path, 'wb') as f:
                        f.write(webhook_response.content)

                    new_report.workflow_id = f"webhook_{new_report.id}"
                    new_report.status = 'completed'
                    new_report.file_name = file_name
                    new_report.file_path = file_path
                else:
                    # Handle JSON response (processing status)
                    new_report.workflow_id = f"webhook_{new_report.id}"
                    new_report.status = 'processing'
            else:
                logging.error(
                    f"Webhook call failed: {webhook_response.status_code}")
                new_report.status = 'failed'

        except requests.exceptions.RequestException as e:
            logging.error(f"Webhook request failed: {str(e)}")
            new_report.status = 'failed'

        db.session.commit()

        return jsonify({
            'message': 'Report generation started',
            'report_id': new_report.id,
            'status': new_report.status
        }), 200

    except Exception as e:
        logging.error(f"Generate report error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to generate report'}), 500


@reports_bp.route('/status/<int:report_id>', methods=['GET'])
@login_required
def get_report_status(report_id):
    try:
        user_id = session['user_id']

        report = Report.query.filter_by(id=report_id, user_id=user_id).first()
        if not report:
            return jsonify({'error': 'Report not found'}), 404

        # Check status with n8n if workflow_id exists
        if report.workflow_id and report.status == 'pending':
            n8n_service = current_app.config['n8n_service']
            workflow_status = n8n_service.check_workflow_status(
                report.workflow_id)

            if workflow_status.get('finished'):
                if workflow_status.get('success'):
                    report.status = 'completed'
                    # Mock file path - in real implementation, this would come from n8n
                    clean_company_name = report.company_name.replace(' ', '_').replace('/', '_').replace('\\', '_')
                    # Use current date in YYYYMMDD format
                    current_date_extended = datetime.now().strftime('%Y%m%d%H%M')
                    report.file_name = f"{clean_company_name}_{current_date_extended}.pdf"
                    report.file_path = os.path.join('reports', report.file_name)
                else:
                    report.status = 'failed'

                db.session.commit()

        return jsonify({
            'report_id':
            report.id,
            'status':
            report.status,
            'company_name':
            report.company_name,
            'file_name':
            report.file_name,
            'created_at':
            report.created_at.isoformat() if report.created_at else None
        }), 200

    except Exception as e:
        logging.error(f"Get report status error: {str(e)}")
        return jsonify({'error': 'Failed to get report status'}), 500


@reports_bp.route('/download/<int:report_id>', methods=['GET'])
@login_required
def download_report(report_id):
    try:
        user_id = session['user_id']

        report = Report.query.filter_by(id=report_id, user_id=user_id).first()
        if not report:
            return jsonify({'error': 'Report not found'}), 404

        if report.status != 'completed' or not report.file_path:
            return jsonify({'error': 'Report not ready for download'}), 400

        # Check if file exists
        if not os.path.exists(report.file_path):
            return jsonify({'error': 'Report file not found'}), 404

        response = send_file(report.file_path,
                         as_attachment=True,
                         download_name=report.file_name,
                         mimetype='application/pdf')
        response.headers['Content-Disposition'] = f'attachment; filename="{report.file_name}"'
        return response

    except Exception as e:
        logging.error(f"Download report error: {str(e)}")
        return jsonify({'error': 'Failed to download report'}), 500


@reports_bp.route('/view/<int:report_id>', methods=['GET'])
@login_required
def view_report(report_id):
    try:
        user_id = session['user_id']

        report = Report.query.filter_by(id=report_id, user_id=user_id).first()
        if not report:
            return jsonify({'error': 'Report not found'}), 404

        if report.status != 'completed' or not report.file_path:
            return jsonify({'error': 'Report not ready for viewing'}), 400

        # Check if file exists
        if not os.path.exists(report.file_path):
            return jsonify({'error': 'Report file not found'}), 404

        return send_file(report.file_path, mimetype='application/pdf')

    except Exception as e:
        logging.error(f"View report error: {str(e)}")
        return jsonify({'error': 'Failed to view report'}), 500


@reports_bp.route('/history', methods=['GET'])
@login_required
def get_report_history():
    try:
        user_id = session['user_id']
        report_type = request.args.get('type')  # Optional filter by report type

        query = Report.query.filter_by(user_id=user_id)

        # Add type filter if specified
        if report_type:
            query = query.filter_by(report_type=report_type)

        reports = query.order_by(Report.created_at.desc()).all()

        reports_data = [report.to_dict() for report in reports]

        return jsonify({'reports': reports_data}), 200

    except Exception as e:
        logging.error(f"Get report history error: {str(e)}")
        return jsonify({'error': 'Failed to get report history'}), 500


@reports_bp.route('/companies', methods=['GET'])
@login_required
def get_companies_for_reports():
    try:
        neo4j_service = current_app.config['neo4j_service']
        companies = neo4j_service.get_companies_list()

        return jsonify({'companies': companies}), 200

    except Exception as e:
        logging.error(f"Get companies for reports error: {str(e)}")
        return jsonify({'error': 'Failed to fetch companies'}), 500


@reports_bp.route('/federterziario-companies', methods=['GET'])
@login_required
def get_federterziario_companies_for_reports():
    try:
        neo4j_service = current_app.config['neo4j_service']
        companies = neo4j_service.get_federterziario_companies_list()

        return jsonify({'companies': companies}), 200

    except Exception as e:
        logging.error(f"Get FEDERTERZIARIO companies for reports error: {str(e)}")
        return jsonify({'error': 'Failed to fetch FEDERTERZIARIO companies'}), 500


@reports_bp.route('/federterziario-company-details/<company_name>', methods=['GET'])
@login_required
def get_federterziario_company_details(company_name):
    try:
        neo4j_service = current_app.config['neo4j_service']
        company_details = neo4j_service.get_federterziario_company_details(company_name)

        if not company_details:
            return jsonify({'error': 'Company not found'}), 404

        return jsonify({'company': company_details}), 200

    except Exception as e:
        logging.error(f"Get FEDERTERZIARIO company details error: {str(e)}")
        return jsonify({'error': 'Failed to fetch company details'}), 500


@reports_bp.route('/relationships/<company_name>', methods=['GET'])
@login_required
def get_company_relationships(company_name):
    try:
        neo4j_service = current_app.config['neo4j_service']
        relationships = neo4j_service.get_company_relationships(company_name)

        return jsonify({'relationships': relationships}), 200

    except Exception as e:
        logging.error(f"Get company relationships error: {str(e)}")
        return jsonify({'error': 'Failed to fetch company relationships'}), 500


@reports_bp.route('/federterziario-relationships/<company_name>', methods=['GET'])
@login_required
def get_federterziario_company_relationships(company_name):
    try:
        neo4j_service = current_app.config['neo4j_service']
        relationships = neo4j_service.get_federterziario_company_relationships(company_name)

        return jsonify({'relationships': relationships}), 200

    except Exception as e:
        logging.error(f"Get FEDERTERZIARIO company relationships error: {str(e)}")
        return jsonify({'error': 'Failed to fetch FEDERTERZIARIO company relationships'}), 500


@reports_bp.route('/bulk-delete', methods=['DELETE'])
@login_required
def bulk_delete_reports():
    try:
        data = request.get_json()

        if not data or not data.get('report_ids'):
            return jsonify({'error': 'Report IDs are required'}), 400

        report_ids = data['report_ids']
        user_id = session['user_id']

        # Verify all reports belong to the current user
        reports = Report.query.filter(
            Report.id.in_(report_ids),
            Report.user_id == user_id
        ).all()

        if len(reports) != len(report_ids):
            return jsonify({'error': 'Some reports not found or access denied'}), 404

        deleted_count = 0

        for report in reports:
            # Delete physical file if exists
            if report.file_path and os.path.exists(report.file_path):
                try:
                    os.remove(report.file_path)
                except Exception as e:
                    logging.warning(f"Failed to delete file {report.file_path}: {str(e)}")

            # Delete from database
            db.session.delete(report)
            deleted_count += 1

        db.session.commit()

        return jsonify({
            'message': f'Successfully deleted {deleted_count} reports',
            'deleted_count': deleted_count
        }), 200

    except Exception as e:
        logging.error(f"Bulk delete reports error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to delete reports'}), 500

@reports_bp.route('/companies/search', methods=['GET'])
@login_required
def search_companies():
    """Search companies by name"""
    try:
        neo4j_service = current_app.config['neo4j_service']
        search_term = request.args.get('term', '')
        if not search_term:
            return jsonify({
                'success': False,
                'error': 'Search term is required'
            }), 400

        companies = neo4j_service.search_companies(search_term)
        return jsonify({
            'success': True,
            'companies': companies
        })
    except Exception as e:
        logging.error(f"Error searching companies: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@reports_bp.route('/startup-companies', methods=['GET'])
@login_required
def get_startup_companies_for_reports():
    try:
        neo4j_service = current_app.config['neo4j_service']
        companies = neo4j_service.get_startup_companies_list()

        return jsonify({'companies': companies}), 200

    except Exception as e:
        logging.error(f"Get STARTUP companies for reports error: {str(e)}")
        return jsonify({'error': 'Failed to fetch STARTUP companies'}), 500


@reports_bp.route('/startup-company-details/<company_name>', methods=['GET'])
@login_required
def get_startup_company_details(company_name):
    try:
        neo4j_service = current_app.config['neo4j_service']
        company_details = neo4j_service.get_startup_company_details(company_name)

        if not company_details:
            return jsonify({'error': 'Company not found'}), 404

        return jsonify({'company': company_details}), 200

    except Exception as e:
        logging.error(f"Get STARTUP company details error: {str(e)}")
        return jsonify({'error': 'Failed to fetch company details'}), 500


@reports_bp.route('/startup-relationships/<company_name>', methods=['GET'])
@login_required
def get_startup_company_relationships(company_name):
    try:
        neo4j_service = current_app.config['neo4j_service']
        relationships = neo4j_service.get_startup_company_relationships(company_name)

        return jsonify({'relationships': relationships}), 200

    except Exception as e:
        logging.error(f"Get STARTUP company relationships error: {str(e)}")
        return jsonify({'error': 'Failed to fetch STARTUP company relationships'}), 500