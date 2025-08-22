// 대시보드 JavaScript

class DashboardManager {
    constructor() {
        this.socket = io();
        this.isMonitoring = false;
        this.auctionData = [];
        this.maxBidLimit = 180;
        
        this.initializeEventListeners();
        this.initializeSocketEvents();
        this.startDashboard();
    }
    
    initializeEventListeners() {
        // 모니터링 토글
        document.getElementById('monitoring-toggle').addEventListener('click', () => {
            this.toggleMonitoring();
        });
        
        // 새로고침 버튼
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.refreshAuctions();
        });
        
        // 입찰 모달
        document.getElementById('submit-bid').addEventListener('click', () => {
            this.submitBid();
        });
        
        // 설정 모달
        document.getElementById('save-settings').addEventListener('click', () => {
            this.saveSettings();
        });
    }
    
    initializeSocketEvents() {
        // 연결 이벤트
        this.socket.on('connect', () => {
            this.addLog('🔗 서버에 연결되었습니다.', 'success');
        });
        
        this.socket.on('disconnect', () => {
            this.addLog('❌ 서버 연결이 끊어졌습니다.', 'error');
        });
        
        // 경매 업데이트
        this.socket.on('auction_update', (data) => {
            this.auctionData = data.items;
            this.updateAuctionTable();
            this.updateStats();
            document.getElementById('last-update').textContent = '방금 전';
        });
        
        // 자동 입찰 실행 알림
        this.socket.on('auto_bid_executed', (data) => {
            this.addLog(`🤖 ${data.message}`, 'success');
            this.showAutoBidToast(data.domain, data.amount);
            
            // 통계 업데이트
            setTimeout(() => this.refreshAuctions(), 1000);
        });
        
        // 입찰 결과
        this.socket.on('bid_result', (data) => {
            const message = `${data.domain}에 $${data.amount} 입찰: ${data.result.success ? '성공' : '실패'}`;
            this.addLog(message, data.result.success ? 'success' : 'error');
            
            if (data.result.success) {
                this.showToast('입찰 성공', message, 'success');
            } else {
                this.showToast('입찰 실패', data.result.message, 'error');
            }
        });
        
        // 모니터링 상태
        this.socket.on('monitoring_started', () => {
            this.isMonitoring = true;
            this.updateMonitoringStatus();
            this.addLog('🚀 경매 모니터링을 시작했습니다.', 'success');
        });
        
        this.socket.on('monitoring_stopped', () => {
            this.isMonitoring = false;
            this.updateMonitoringStatus();
            this.addLog('⏹️ 경매 모니터링을 중지했습니다.', 'warning');
        });
    }
    
    startDashboard() {
        this.addLog('🎉 승환님, 대시보드에 오신 것을 환영합니다!', 'success');
        this.addLog('💡 모니터링을 시작하여 실시간 경매를 확인하세요.', 'info');
        
        // 초기 데이터 로드
        this.refreshAuctions();
        
        // 환영 메시지
        setTimeout(() => {
            this.showToast('환영합니다!', '승환님의 GoDaddy 경매 대시보드입니다.', 'success');
        }, 1000);
    }
    
    toggleMonitoring() {
        if (this.isMonitoring) {
            this.socket.emit('stop_monitoring');
        } else {
            this.socket.emit('start_monitoring');
        }
    }
    
    updateMonitoringStatus() {
        const statusBadge = document.getElementById('monitoring-status');
        const toggleBtn = document.getElementById('monitoring-toggle');
        
        if (this.isMonitoring) {
            statusBadge.textContent = '실행 중';
            statusBadge.className = 'badge bg-success';
            toggleBtn.innerHTML = '<i class="fas fa-stop me-1"></i>중지하기';
            toggleBtn.className = 'btn btn-danger';
        } else {
            statusBadge.textContent = '중지됨';
            statusBadge.className = 'badge bg-secondary';
            toggleBtn.innerHTML = '<i class="fas fa-play me-1"></i>시작하기';
            toggleBtn.className = 'btn btn-success';
        }
    }
    
    async refreshAuctions() {
        const refreshBtn = document.getElementById('refresh-btn');
        const originalHTML = refreshBtn.innerHTML;
        
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        try {
            const response = await fetch('/api/auctions');
            const data = await response.json();
            
            if (data.success) {
                this.auctionData = data.items;
                this.maxBidLimit = data.max_bid_limit;
                this.updateAuctionTable();
                this.updateStats();
                this.addLog('🔄 경매 목록을 새로고침했습니다.', 'info');
            } else {
                this.showToast('오류', data.message, 'error');
            }
        } catch (error) {
            this.addLog(`❌ 새로고침 실패: ${error.message}`, 'error');
            this.showToast('오류', '새로고침에 실패했습니다.', 'error');
        } finally {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = originalHTML;
        }
    }
    
    updateAuctionTable() {
        const tbody = document.getElementById('auction-table-body');
        
        if (this.auctionData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted py-5">
                        <i class="fas fa-info-circle fa-2x mb-3"></i><br>
                        <strong>입찰 중인 도메인이 없습니다.</strong><br>
                        <small>모니터링을 시작하면 경매 목록이 표시됩니다.</small>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = this.auctionData.map(item => {
            const isMyBid = item.my_current_bid > 0;
            const isWinning = item.my_current_bid >= item.current_bid;
            const statusIcon = isWinning ? '🏆' : (isMyBid ? '🎯' : '');
            
            return `
                <tr class="fade-in">
                    <td>
                        <div class="d-flex align-items-center">
                            <span class="domain-name">${item.domain_name}</span>
                            ${isMyBid ? '<i class="fas fa-user text-primary ms-2" title="내 입찰"></i>' : ''}
                            ${statusIcon ? `<span class="ms-2">${statusIcon}</span>` : ''}
                        </div>
                    </td>
                    <td>
                        <span class="bid-amount ${isWinning ? 'text-success' : ''}">\$${item.current_bid.toFixed(2)}</span>
                    </td>
                    <td>
                        <span class="my-bid">${item.my_current_bid > 0 ? '$' + item.my_current_bid.toFixed(2) : '-'}</span>
                    </td>
                    <td>
                        <span class="time-left">${item.time_left}</span>
                    </td>
                    <td>
                        <span class="text-muted">\$${item.max_bid.toFixed(2)}</span>
                    </td>
                    <td>
                        <div class="d-flex align-items-center">
                            <span class="bid-status ${item.auto_bid_enabled ? 'active' : 'inactive'}"></span>
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" 
                                       ${item.auto_bid_enabled ? 'checked' : ''} 
                                       onchange="dashboard.toggleAutoBid('${item.domain_name}', this.checked)">
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="btn-group btn-group-sm" role="group">
                            <button class="btn btn-outline-primary" onclick="dashboard.showBidModal('${item.domain_name}', ${item.current_bid})" title="입찰하기">
                                <i class="fas fa-gavel"></i>
                            </button>
                            <button class="btn btn-outline-warning" onclick="dashboard.showSettingsModal('${item.domain_name}', ${item.max_bid}, ${item.auto_bid_enabled})" title="설정">
                                <i class="fas fa-cog"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    updateStats() {
        const activeBids = this.auctionData.filter(item => item.my_current_bid > 0).length;
        const autoBids = this.auctionData.filter(item => item.auto_bid_enabled).length;
        
        document.getElementById('active-bids').textContent = activeBids;
        document.getElementById('auto-bids').textContent = autoBids;
    }
    
    showBidModal(domainName, currentBid) {
        document.getElementById('bid-domain').value = domainName;
        document.getElementById('current-bid-display').value = currentBid.toFixed(2);
        document.getElementById('bid-amount').value = (currentBid + 5).toFixed(2);
        document.getElementById('bid-amount').max = this.maxBidLimit;
        
        const modal = new bootstrap.Modal(document.getElementById('bidModal'));
        modal.show();
    }
    
    showSettingsModal(domainName, maxBid, autoBid) {
        document.getElementById('settings-domain').value = domainName;
        document.getElementById('settings-max-bid').value = maxBid;
        document.getElementById('settings-max-bid').max = this.maxBidLimit;
        document.getElementById('settings-auto-bid').checked = autoBid;
        
        const modal = new bootstrap.Modal(document.getElementById('settingsModal'));
        modal.show();
    }
    
    async submitBid() {
        const domain = document.getElementById('bid-domain').value;
        const amount = parseFloat(document.getElementById('bid-amount').value);
        
        if (!domain || !amount || amount <= 0) {
            this.showToast('오류', '올바른 입찰 정보를 입력하세요.', 'error');
            return;
        }
        
        if (amount > this.maxBidLimit) {
            this.showToast('오류', `입찰 한도($${this.maxBidLimit})를 초과했습니다.`, 'error');
            return;
        }
        
        const submitBtn = document.getElementById('submit-bid');
        const originalHTML = submitBtn.innerHTML;
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>입찰 중...';
        
        try {
            const response = await fetch('/api/bid', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    domain_name: domain,
                    bid_amount: amount
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.addLog(`💰 ${domain}에 $${amount} 입찰 성공`, 'success');
                this.showToast('입찰 성공', data.message, 'success');
                
                // 모달 닫기
                const modal = bootstrap.Modal.getInstance(document.getElementById('bidModal'));
                modal.hide();
                
                // 목록 새로고침
                setTimeout(() => this.refreshAuctions(), 1000);
            } else {
                this.addLog(`❌ ${domain} 입찰 실패: ${data.message}`, 'error');
                this.showToast('입찰 실패', data.message, 'error');
            }
        } catch (error) {
            this.addLog(`❌ 입찰 요청 실패: ${error.message}`, 'error');
            this.showToast('오류', '입찰 요청에 실패했습니다.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHTML;
        }
    }
    
    async saveSettings() {
        const domain = document.getElementById('settings-domain').value;
        const maxBid = parseFloat(document.getElementById('settings-max-bid').value) || 0;
        const autoBid = document.getElementById('settings-auto-bid').checked;
        
        if (!domain) {
            this.showToast('오류', '도메인을 선택하세요.', 'error');
            return;
        }
        
        if (maxBid > this.maxBidLimit) {
            this.showToast('오류', `최대 입찰가 한도($${this.maxBidLimit})를 초과했습니다.`, 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    domain_name: domain,
                    max_bid: maxBid,
                    auto_bid: autoBid
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.addLog(`⚙️ ${domain} 설정 업데이트 완료`, 'success');
                this.showToast('설정 저장', '설정이 저장되었습니다.', 'success');
                
                // 모달 닫기
                const modal = bootstrap.Modal.getInstance(document.getElementById('settingsModal'));
                modal.hide();
                
                // 목록 새로고침
                this.refreshAuctions();
            } else {
                this.showToast('오류', data.message, 'error');
            }
        } catch (error) {
            this.addLog(`❌ 설정 저장 실패: ${error.message}`, 'error');
            this.showToast('오류', '설정 저장에 실패했습니다.', 'error');
        }
    }
    
    async toggleAutoBid(domainName, enabled) {
        const item = this.auctionData.find(item => item.domain_name === domainName);
        if (!item) return;
        
        try {
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    domain_name: domainName,
                    max_bid: item.max_bid,
                    auto_bid: enabled
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                const status = enabled ? '활성화' : '비활성화';
                this.addLog(`🤖 ${domainName} 자동 입찰 ${status}`, 'info');
                this.refreshAuctions();
            } else {
                this.showToast('오류', data.message, 'error');
                // 체크박스 상태 되돌리기
                const checkbox = document.querySelector(`input[onchange*="${domainName}"]`);
                if (checkbox) checkbox.checked = !enabled;
            }
        } catch (error) {
            this.addLog(`❌ 자동 입찰 설정 실패: ${error.message}`, 'error');
            this.showToast('오류', '자동 입찰 설정에 실패했습니다.', 'error');
        }
    }
    
    addLog(message, type = 'info') {
        const logContainer = document.getElementById('activity-log');
        const time = new Date().toLocaleTimeString('ko-KR', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
        
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.innerHTML = `
            <span class="log-time">${time}</span>
            <span class="log-message">${message}</span>
        `;
        
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
        
        // 로그 항목이 너무 많으면 오래된 것 삭제
        const entries = logContainer.querySelectorAll('.log-entry');
        if (entries.length > 100) {
            entries[0].remove();
        }
        
        // 애니메이션 효과
        logEntry.style.opacity = '0';
        logEntry.style.transform = 'translateX(-20px)';
        setTimeout(() => {
            logEntry.style.transition = 'all 0.3s ease';
            logEntry.style.opacity = '1';
            logEntry.style.transform = 'translateX(0)';
        }, 100);
    }
    
    showToast(title, message, type = 'info') {
        const toast = document.getElementById('toast');
        const toastBody = document.getElementById('toast-body');
        const toastHeader = toast.querySelector('.toast-header strong');
        const toastIcon = toast.querySelector('.toast-header i');
        
        // 아이콘 및 색상 설정
        const iconMap = {
            success: 'fas fa-check-circle text-success',
            error: 'fas fa-exclamation-circle text-danger',
            warning: 'fas fa-exclamation-triangle text-warning',
            info: 'fas fa-info-circle text-primary'
        };
        
        toastIcon.className = iconMap[type] || iconMap.info;
        toastHeader.textContent = title;
        toastBody.textContent = message;
        
        const bsToast = new bootstrap.Toast(toast, {
            delay: 4000
        });
        bsToast.show();
    }
    
    showAutoBidToast(domain, amount) {
        const toast = document.getElementById('auto-bid-toast');
        const toastBody = document.getElementById('auto-bid-toast-body');
        
        toastBody.textContent = `${domain}에 $${amount} 자동 입찰 완료!`;
        
        const bsToast = new bootstrap.Toast(toast, {
            delay: 6000
        });
        bsToast.show();
        
        // 특별 효과
        toast.classList.add('success-glow');
        setTimeout(() => {
            toast.classList.remove('success-glow');
        }, 3000);
    }
}

// 로그아웃 함수
function logout() {
    if (confirm('정말 로그아웃하시겠습니까?')) {
        window.location.href = '/';
    }
}

// 전역 대시보드 인스턴스 생성
const dashboard = new DashboardManager();

// 페이지 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    console.log('대시보드가 초기화되었습니다.');
    
    // 30초마다 자동 새로고침
    setInterval(() => {
        if (dashboard.isMonitoring) {
            dashboard.refreshAuctions();
        }
    }, 30000);
    
    // 시간 업데이트
    setInterval(() => {
        const now = new Date();
        const timeString = now.toLocaleTimeString('ko-KR');
        document.getElementById('last-update').textContent = timeString;
    }, 1000);
});
