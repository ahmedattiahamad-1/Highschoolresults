import os
import gzip
import csv
# pyrefly: ignore [missing-import]
from flask import Flask, request, jsonify, render_template
import re
import itertools

app = Flask(__name__)

total_students = 0
max_degree = 320 # Hardcoded as requested
data_file_path = os.path.join(os.path.dirname(__file__), 'data.csv.gz')

def normalize_arabic(text):
    if not isinstance(text, str):
        return ""
    text = text.strip()
    # Normalize Alef
    text = re.sub(r'[أإآ]', 'ا', text)
    # Normalize Yaa
    text = re.sub(r'[يى]', 'ي', text)
    # Normalize Taa Marbuta
    text = re.sub(r'ة', 'ه', text)
    # Remove diacritics if any (Tashkeel)
    text = re.sub(r'[\u0617-\u061A\u064B-\u0652]', '', text)
    return text

def load_data():
    global total_students
    print("Loading CSV metadata...")
    if not os.path.exists(data_file_path):
        print(f"File not found: {data_file_path}")
        return
    with gzip.open(data_file_path, 'rt', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader) # skip header
        total_students = sum(1 for _ in reader)
    print(f"Data loaded successfully. Total students: {total_students}")

def format_student(row):
    deg_str = row[2]
    deg = float(deg_str) if deg_str else 0
    percentage = (deg / max_degree) * 100
    
    return {
        "seating_no": row[0],
        "name": row[1],
        "total_degree": deg,
        "percentage": round(percentage, 2),
        "status": row[3] if row[3] else 'غير محدد',
        "rank": int(float(row[4])) if row[4] else 0
    }

@app.route('/')
def index():
    return render_template('index.html', total_students=total_students)

@app.route('/api/students')
def get_students():
    query = request.args.get('q', '').strip()
    start_idx = int(request.args.get('start', 0))
    per_page = 10
    
    if query:
        norm_query = normalize_arabic(query)
        match_idx = -1
        with gzip.open(data_file_path, 'rt', encoding='utf-8') as f:
            reader = csv.reader(f)
            next(reader)
            for i, row in enumerate(reader):
                if query == row[0] or norm_query in row[5]:
                    match_idx = i
                    break
                    
        if match_idx != -1:
            start_idx = match_idx
        else:
            return jsonify({"results": [], "total_students": total_students, "start_idx": 0})
            
    # Ensure start_idx is within bounds
    start_idx = max(0, min(start_idx, total_students - 1))
    
    results = []
    with gzip.open(data_file_path, 'rt', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader)
        # Advance iterator to start_idx and take per_page items
        page_iter = itertools.islice(reader, start_idx, start_idx + per_page)
        for row in page_iter:
            results.append(format_student(row))
    
    end_idx = start_idx + len(results)
    return jsonify({
        "results": results, 
        "total_students": total_students,
        "start_idx": start_idx,
        "has_more": end_idx < total_students
    })

@app.route('/robots.txt')
def robots():
    content = "User-agent: *\nDisallow:\nSitemap: https://your-domain.com/sitemap.xml"
    return app.response_class(content, mimetype='text/plain')

@app.route('/sitemap.xml')
def sitemap():
    # A basic sitemap telling Google to index the main page
    content = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://your-domain.com/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>"""
    return app.response_class(content, mimetype='application/xml')

@app.after_request
def add_header(response):
    # Prevent browser caching so the user always gets the latest version
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '-1'
    return response

# Load data unconditionally so it works on WSGI servers (Vercel, Render, Gunicorn)
load_data()

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5001, debug=False)
