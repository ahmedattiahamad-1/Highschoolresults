document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const resultsContainer = document.getElementById('resultsContainer');
    const noResults = document.getElementById('noResults');
    const paginationSection = document.getElementById('paginationSection');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageInfo = document.getElementById('pageInfo');

    let currentStartIndex = 0;
    let currentTotalStudents = 0;
    let hasMore = false;

    // Load initial data (start index 0)
    loadStudents();

    // Search logic
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    searchBtn.addEventListener('click', performSearch);

    function performSearch() {
        const query = searchInput.value.trim();
        loadStudents(query);
    }

    // Pagination logic
    prevBtn.addEventListener('click', () => {
        if (currentStartIndex >= 10) {
            currentStartIndex -= 10;
            loadStudents();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (hasMore) {
            currentStartIndex += 10;
            loadStudents();
        }
    });

    async function loadStudents(query = "") {
        showLoading();
        try {
            let url = `/api/students?start=${currentStartIndex}`;
            if (query) {
                // If there is a query, we let the backend find the start index
                url = `/api/students?q=${encodeURIComponent(query)}`;
            }
            
            const response = await fetch(url);
            const data = await response.json();
            
            hideLoading();

            if (data.results && data.results.length > 0) {
                currentStartIndex = data.start_idx;
                currentTotalStudents = data.total_students;
                hasMore = data.has_more;
                
                updatePaginationControls();
                renderResults(data.results, data.total_students);
            } else {
                showNoResults();
            }
        } catch (error) {
            console.error('Loading students failed:', error);
            hideLoading();
            showNoResults();
        }
    }

    function updatePaginationControls() {
        paginationSection.classList.remove('hidden');
        
        // Calculate current page based on index
        const currentPage = Math.floor(currentStartIndex / 10) + 1;
        const totalPages = Math.ceil(currentTotalStudents / 10);
        
        pageInfo.textContent = `صفحة ${currentPage.toLocaleString('ar-EG')} من ${totalPages.toLocaleString('ar-EG')}`;
        
        prevBtn.disabled = currentStartIndex === 0;
        nextBtn.disabled = !hasMore;
    }

    // Helpers
    function showLoading() {
        loadingIndicator.classList.add('active');
        resultsContainer.innerHTML = '';
        noResults.classList.add('hidden');
        paginationSection.classList.add('hidden');
    }

    function hideLoading() {
        loadingIndicator.classList.remove('active');
    }

    function showNoResults() {
        noResults.classList.remove('hidden');
        paginationSection.classList.add('hidden');
    }

    function renderResults(results, totalStudents) {
        resultsContainer.innerHTML = '';
        
        results.forEach((student, index) => {
            // Determine status color class
            let statusClass = 'status-success';
            if (student.status.includes('راسب') || student.status.includes('دور ثاني')) {
                statusClass = 'status-danger';
            } else if (student.status.includes('مؤجل')) {
                statusClass = 'status-warning';
            }
            
            // Format numbers
            const formattedTotal = totalStudents.toLocaleString('ar-EG');
            const formattedRank = student.rank.toLocaleString('ar-EG');

            const card = document.createElement('div');
            card.className = 'student-card';
            card.style.animationDelay = `${index * 0.05}s`;
            
            // Highlight if it's the exact searched result (the first card after a search)
            if (index === 0 && searchInput.value.trim() !== '') {
                card.style.border = '2px solid var(--primary)';
                card.style.boxShadow = '0 0 15px rgba(79, 70, 229, 0.4)';
            }
            
            card.innerHTML = `
                <div class="student-info">
                    <h2>${student.name}</h2>
                    <div class="seating-badge">رقم الجلوس: ${student.seating_no}</div>
                    
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-label">المجموع الكلي</span>
                            <span class="stat-value">
                                <i class="ph-fill ph-star"></i>
                                ${student.total_degree}
                            </span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">النسبة المئوية</span>
                            <span class="stat-value percentage-badge">
                                <i class="ph-fill ph-chart-pie-slice"></i>
                                ${student.percentage}%
                            </span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">حالة الطالب</span>
                            <span class="stat-value ${statusClass}">
                                <i class="ph-fill ph-info"></i>
                                ${student.status}
                            </span>
                        </div>
                    </div>
                </div>
                
                <div class="rank-container">
                    <span class="rank-label">الترتيب</span>
                    <span class="rank-value">#${formattedRank}</span>
                    <span class="rank-total">من ${formattedTotal} طالب</span>
                </div>
            `;
            
            resultsContainer.appendChild(card);
        });
    }
});
