import os
import pandas as pd
# pyrefly: ignore [missing-import]
from flask import Flask, request, jsonify, render_template
import re

app = Flask(__name__)

# Global variables to store dataframe
df = None
total_students = 0
max_degree = 320 # Hardcoded as requested

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
    global df, total_students
    print("Loading Excel file...")
    file_path = os.path.join(os.path.dirname(__file__), 'يرو500.xlsx')
    df = pd.read_excel(file_path)
    
    # Calculate rank based on total_degree
    df['rank'] = df['total_degree'].rank(method='min', ascending=False)
    
    # Sort dataframe by rank ascending, then reset index so we can jump to row numbers
    df.sort_values(by=['rank', 'seating_no'], inplace=True, ascending=[True, True])
    df.reset_index(drop=True, inplace=True)
    
    # Preprocess columns for easier searching
    df['seating_no'] = df['seating_no'].astype(str)
    df['arabic_name'] = df['arabic_name'].fillna('').astype(str)
    df['normalized_name'] = df['arabic_name'].apply(normalize_arabic)
    
    total_students = len(df)
    
    print(f"Data loaded successfully. Total students: {total_students}")

def format_student(row):
    deg = row.get('total_degree', 0)
    percentage = (deg / max_degree) * 100 if pd.notnull(deg) else 0
    return {
        "seating_no": row['seating_no'],
        "name": row['arabic_name'],
        "total_degree": deg,
        "percentage": round(percentage, 2),
        "status": row.get('student_case_desc', 'غير محدد'),
        "rank": int(row['rank']) if pd.notnull(row['rank']) else 0
    }

@app.route('/')
def index():
    return render_template('index.html', total_students=total_students)

@app.route('/api/students')
def get_students():
    query = request.args.get('q', '').strip()
    start_idx = int(request.args.get('start', 0))
    per_page = 10
    
    # If a search query is provided, we find the first match and use its index as start_idx
    if query:
        # Search by exact seating number first
        match_idx = df.index[df['seating_no'] == query].tolist()
        
        # If no match by seating number, search by normalized name
        if not match_idx:
            norm_query = normalize_arabic(query)
            # Find first occurrence where normalized name contains the query
            match_series = df['normalized_name'].str.contains(norm_query, case=False, na=False)
            if match_series.any():
                match_idx = [match_series.idxmax()] # idxmax returns the first True index
                
        if match_idx:
            start_idx = match_idx[0]
        else:
            # No results found for query
            return jsonify({"results": [], "total_students": total_students, "start_idx": 0})
            
    # Ensure start_idx is within bounds
    start_idx = max(0, min(start_idx, total_students - 1))
    end_idx = min(start_idx + per_page, total_students)
    
    page_data = df.iloc[start_idx:end_idx]
    results = [format_student(row) for _, row in page_data.iterrows()]
    
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

if __name__ == '__main__':
    load_data()
    app.run(host='127.0.0.1', port=5001, debug=False)
