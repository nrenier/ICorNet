from flask import Blueprint, request, jsonify, session, current_app, send_file
from routes.auth import login_required
from models import db, Report, User
import logging
import os

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
        
        # Create report record
        new_report = Report()
        new_report.user_id = user_id
        new_report.company_name = company_name
        new_report.status = 'pending'
        
        db.session.add(new_report)
        db.session.commit()
        
        # Call n8n webhook directly
        import requests
        webhook_url = "http://host.docker.internal:5678/webhook-test/baf08e2e-8b5b-414e-bde2-109cec9b60ab"
        webhook_payload = {
            "nome_azienda": company_name
        }
        
        try:
            webhook_response = requests.post(
                webhook_url, 
                json=webhook_payload, 
                timeout=60,
                headers={'Content-Type': 'application/json'}
            )
            
            if webhook_response.status_code == 200:
                # Check if response is binary PDF
                content_type = webhook_response.headers.get('content-type', '')
                if 'application/pdf' in content_type or webhook_response.content.startswith(b'%PDF'):
                    # Save the PDF file
                    os.makedirs('reports', exist_ok=True)
                    file_name = f"{company_name}_report_{new_report.id}.pdf"
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
                logging.error(f"Webhook call failed: {webhook_response.status_code}")
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
            workflow_status = n8n_service.check_workflow_status(report.workflow_id)
            
            if workflow_status.get('finished'):
                if workflow_status.get('success'):
                    report.status = 'completed'
                    # Mock file path - in real implementation, this would come from n8n
                    report.file_name = f"{report.company_name}_report_{report.id}.pdf"
                    report.file_path = f"/reports/{report.file_name}"
                else:
                    report.status = 'failed'
                
                db.session.commit()
        
        return jsonify({
            'report_id': report.id,
            'status': report.status,
            'company_name': report.company_name,
            'file_name': report.file_name,
            'created_at': report.created_at.isoformat() if report.created_at else None
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
        
        return send_file(
            report.file_path,
            as_attachment=True,
            download_name=report.file_name,
            mimetype='application/pdf'
        )
        
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
        
        return send_file(
            report.file_path,
            mimetype='application/pdf'
        )
        
    except Exception as e:
        logging.error(f"View report error: {str(e)}")
        return jsonify({'error': 'Failed to view report'}), 500

@reports_bp.route('/history', methods=['GET'])
@login_required
def get_report_history():
    try:
        user_id = session['user_id']
        
        reports = Report.query.filter_by(user_id=user_id).order_by(
            Report.created_at.desc()
        ).all()
        
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
