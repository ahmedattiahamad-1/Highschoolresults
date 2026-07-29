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

    // Check URL for search query
    const urlParams = new URLSearchParams(window.location.search);
    const queryParam = urlParams.get('q');
    
    if (queryParam) {
        searchInput.value = queryParam;
        performSearch();
    } else {
        // Load initial data (start index 0)
        loadStudents();
    }

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
                
                <div class="card-actions">
                    <button class="action-btn download-btn" onclick="downloadCard(this, '${student.name}')" title="تحميل النتيجة كصورة">
                        <i class="ph ph-download-simple"></i> تحميل
                    </button>
                    <button class="action-btn share-btn" onclick="shareResult('${student.name}', '${student.percentage}', '${student.seating_no}')" title="مشاركة النتيجة">
                        <i class="ph ph-share-network"></i> مشاركة
                    </button>
                </div>
            `;
            
            resultsContainer.appendChild(card);
        });
    }

    // Share result function
    window.shareResult = function(name, percentage, seatingNo) {
        const url = window.location.origin + window.location.pathname + '?q=' + seatingNo;
        if (navigator.share) {
            navigator.share({
                title: 'نتيجة الثانوية العامة - ' + name,
                text: 'حصل ' + name + ' على نسبة ' + percentage + '% في الثانوية العامة!',
                url: url
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(url)
                .then(() => alert('تم نسخ رابط النتيجة بنجاح!'))
                .catch(err => console.error('فشل النسخ', err));
        }
    };

    // Download card as image
    window.downloadCard = function(btnElement, studentName) {
        const originalCard = btnElement.closest('.student-card');
        if (!originalCard) return;
        
        // Clone the card for capturing
        const cardClone = originalCard.cloneNode(true);
        
        // Remove the action buttons from the clone
        const actions = cardClone.querySelector('.card-actions');
        if (actions) actions.remove();
        
        // Create a watermark element
        const watermark = document.createElement('div');
        watermark.innerHTML = `تم الاستعلام عبر موقع: <strong>https://highschoolresults.vercel.app</strong>`;
        watermark.style.textAlign = 'center';
        watermark.style.padding = '12px';
        watermark.style.color = '#4f46e5';
        watermark.style.fontSize = '14px';
        watermark.style.borderTop = '2px dashed #e5e7eb';
        watermark.style.marginTop = '20px';
        watermark.style.direction = 'rtl';
        cardClone.appendChild(watermark);
        
        // Fix gradient text issue in html2canvas (rank value)
        const rankValue = cardClone.querySelector('.rank-value');
        if (rankValue) {
            rankValue.style.background = 'none';
            rankValue.style.webkitTextFillColor = 'initial';
            rankValue.style.color = '#4f46e5'; // Solid primary color
        }
        
        // Ensure card clone has explicit styles for capture
        cardClone.style.position = 'absolute';
        cardClone.style.left = '-9999px';
        cardClone.style.top = '0';
        cardClone.style.width = originalCard.offsetWidth + 'px'; 
        cardClone.style.backgroundColor = '#ffffff';
        cardClone.style.color = '#1f2937';
        cardClone.style.borderRadius = '20px';
        cardClone.style.boxShadow = 'none';
        cardClone.style.border = '2px solid #e5e7eb';
        cardClone.style.padding = '24px';
        cardClone.style.margin = '0';
        cardClone.style.direction = 'rtl';
        
        // Explicitly set text colors for stat values in clone
        const statValues = cardClone.querySelectorAll('.stat-value');
        statValues.forEach(el => {
            el.style.color = '#1f2937';
            if(el.classList.contains('percentage-badge')) el.style.color = '#4f46e5';
            if(el.classList.contains('status-success')) el.style.color = '#10b981';
            if(el.classList.contains('status-danger')) el.style.color = '#ef4444';
            if(el.classList.contains('status-warning')) el.style.color = '#f59e0b';
        });

        // Add explicit color for student name and badge
        const nameEl = cardClone.querySelector('h2');
        if (nameEl) nameEl.style.color = '#1f2937';
        const badgeEl = cardClone.querySelector('.seating-badge');
        if (badgeEl) {
            badgeEl.style.backgroundColor = '#f3f4f6';
            badgeEl.style.color = '#4f46e5';
        }

        document.body.appendChild(cardClone);
        
        // Convert to image
        html2canvas(cardClone, {
            scale: 2, 
            backgroundColor: '#ffffff',
            useCORS: true,
            logging: false
        }).then(canvas => {
            document.body.removeChild(cardClone);
            
            const link = document.createElement('a');
            link.download = `نتيجة_${studentName.replace(/\s+/g, '_')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        }).catch(err => {
            console.error('Error generating image:', err);
            if (document.body.contains(cardClone)) {
                document.body.removeChild(cardClone);
            }
            alert('حدث خطأ أثناء تحميل الصورة.');
        });
    };
});
