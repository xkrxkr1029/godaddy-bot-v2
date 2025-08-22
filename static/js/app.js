// GoDaddy 웹 봇 JavaScript

class GoDaddyBot {
    constructor() {
        this.socket = io();
        this.isLoggedIn = false;
        this.isMonitoring = false;
        this.auctionData = [];
        
        this.initializeEventListeners();
        this.initializeSocketEvents();
    }
    
    initializeEventListeners() {
        // 로그인 폼
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });
        
        // 모니터링 버튼
        document.getElementById('monitoring-btn').addEventListener('click', () => {
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
            this.addLog('서버에 연결되었습니다.', 'success');
        });
        
        this.socket.on('disconnect', () => {
            this.addLog('서버 연결이 끊어졌습니다.', 'error');
            this.updateStatus('연결 끊김', 'offline');
        });
        
        // 로그인 결과
        this.socket.on('login_result', (data) => {
            if (data.success) {
                this.isLoggedIn = true;
                this.updateStatus('로그인 성공', 'online');
                this.addLog('GoDaddy에 로그인했습니다.', 'success');
                document.getElementById('monitoring-btn').disabled = false;
                this.refreshAuctions();
            } else {
                this.addLog(`로그인 실패: ${data.message}`, 'error');
                this.showToast('로그인 실패', data.message, 'error');
            }
        });
        
        // 경매 업데이트
        this.socket.on('auction_update', (data) => {
            this.auctionData = data.items;
            this.updateAuctionTable();
            this.updateStats();
            document.getElementById('last-updated').textContent = `마지막 업데이트: ${data.timestamp}`;
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
            this.updateMonitoringButton();
            this.updateStatus('모니터링 중', 'monitoring');
            this.addLog('경매 모니터링을 시작했습니다.', 'success');
        });
        
        this.socket.on('monitoring_stopped', () => {
            this.isMonitoring = false;
            this.updateMonitoringButton();
            this.updateStatus('로그인됨', 'online');
            this.addLog('경매 모니터링을 중지했습니다.', 'warning');
        });
        
        // 오류 처리
        this.socket.on('error', (data) => {
            this.addLog(data.message, 'error');
            this.showToast('오류', data.message, 'error');
        });
    }
    
    async login() {
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();
        
        if (!email || !password) {
            this.showToast('오류', '이메일과 비밀번호를 입력하세요.', 'error');
            return;
        }
        
        const loginBtn = document.querySelector('#login-form button');
        const originalText = loginBtn.innerHTML;
        
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>로그인 중...';
        
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.addLog('로그인을 시도하고 있습니다...', 'info');
            } else {
                this.showToast('오류', data.message, 'error');
            }
        } catch (error) {
            this.addLog(`로그인 요청 실패: ${error.message}`, 'error');
            this.showToast('오류', '로그인 요청에 실패했습니다.', 'error');
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerHTML = originalText;
        }
    }
    
    toggleMonitoring() {
        if (!this.isLoggedIn) {
            this.showToast('오류', '먼저 로그인하세요.', 'error');
            return;
        }
        
        if (this.isMonitoring) {
            this.socket.emit('stop_monitoring');
        } else {
            this.socket.emit('start_monitoring');
        }
    }
    
    async refreshAuctions() {
        if (!this.isLoggedIn) {
            this.showToast('오류', '먼저 로그인하세요.', 'error');
            return;
        }
        
        const refreshBtn = document.getElementById('refresh-btn');
        const originalHTML = refreshBtn.innerHTML;
        
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        try {
            const response = await fetch('/api/auctions');
            const data = await response.json();
            
            if (data.success) {
                this.auctionData = data.items;
                this.updateAuctionTable();
                this.updateStats();
                this.addLog('경매 목록을 새로고침했습니다.', 'info');
            } else {
                this.showToast('오류', data.message, 'error');
            }
        } catch (error) {
            this.addLog(`새로고침 실패: ${error.message}`, 'error');
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
                    <td colspan="6" class="text-center text-muted py-4">
                        <i class="fas fa-info-circle me-2"></i>
                        입찰 중인 도메인이 없습니다.
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = this.auctionData.map(item => `
            <tr class="fade-in">
                <td>
                    <span class="domain-name">${item.domain_name}</span>
                </td>
                <td>
                    <span class="bid-amount">$${item.current_bid.toFixed(2)}</span>
                </td>
                <td>
                    <span class="time-left">${item.time_left}</span>
                </td>
                <td>
                    <span class="text-muted">${item.max_bid > 0 ? '$' + item.max_bid.toFixed(2) : '-'}</span>
                </td>
                <td>
                    <div class="form-check form-switch">
                        <input class="form-check-input auto-bid-toggle" type="checkbox" 
                               ${item.auto_bid_enabled ? 'checked' : ''} 
                               onchange="bot.toggleAutoBid('${item.domain_name}', this.checked)">
                        <span class="bid-status ${item.auto_bid_enabled ? 'active' : 'inactive'}"></span>
                    </div>
                </td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-outline-primary" onclick="bot.showBidModal('${item.domain_name}', ${item.current_bid})">
                            <i class="fas fa-gavel"></i>
                        </button>
                        <button class="btn btn-outline-secondary" onclick="bot.showSettingsModal('${item.domain_name}', ${item.max_bid}, ${item.auto_bid_enabled})">
                            <i class="fas fa-cog"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    updateStats() {
        document.getElementById('total-domains').textContent = this.auctionData.length;
        document.getElementById('auto-bid-count').textContent = 
            this.auctionData.filter(item => item.auto_bid_enabled).length;
    }
    
    updateStatus(text, type) {
        const badge = document.getElementById('status-badge');
        badge.textContent = text;
        badge.className = `badge bg-secondary status-${type}`;
    }
    
    updateMonitoringButton() {
        const btn = document.getElementById('monitoring-btn');
        
        if (this.isMonitoring) {
            btn.innerHTML = '<i class="fas fa-stop me-1"></i>모니터링 중지';
            btn.className = 'btn btn-outline-danger';
        } else {
            btn.innerHTML = '<i class="fas fa-play me-1"></i>모니터링 시작';
            btn.className = 'btn btn-outline-light';
        }
    }
    
    showBidModal(domainName, currentBid) {
        document.getElementById('bid-domain').value = domainName;
        document.getElementById('bid-amount').value = (currentBid + 5).toFixed(2);
        
        const modal = new bootstrap.Modal(document.getElementById('bidModal'));
        modal.show();
    }
    
    showSettingsModal(domainName, maxBid, autoBid) {
        document.getElementById('settings-domain').value = domainName;
        document.getElementById('settings-max-bid').value = maxBid || '';
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
                this.addLog(`${domain}에 $${amount} 입찰 성공`, 'success');
                this.showToast('입찰 성공', data.message, 'success');
                
                // 모달 닫기
                const modal = bootstrap.Modal.getInstance(document.getElementById('bidModal'));
                modal.hide();
                
                // 목록 새로고침
                setTimeout(() => this.refreshAuctions(), 2000);
            } else {
                this.addLog(`${domain} 입찰 실패: ${data.message}`, 'error');
                this.showToast('입찰 실패', data.message, 'error');
            }
        } catch (error) {
            this.addLog(`입찰 요청 실패: ${error.message}`, 'error');
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
                this.addLog(`${domain} 설정 업데이트 완료`, 'success');
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
            this.addLog(`설정 저장 실패: ${error.message}`, 'error');
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
                this.addLog(`${domainName} 자동 입찰 ${enabled ? '활성화' : '비활성화'}`, 'info');
                this.refreshAuctions();
            } else {
                this.showToast('오류', data.message, 'error');
                // 체크박스 상태 되돌리기
                const checkbox = document.querySelector(`input[onchange*="${domainName}"]`);
                if (checkbox) checkbox.checked = !enabled;
            }
        } catch (error) {
            this.addLog(`자동 입찰 설정 실패: ${error.message}`, 'error');
            this.showToast('오류', '자동 입찰 설정에 실패했습니다.', 'error');
        }
    }
    
    addLog(message, type = 'info') {
        const logContainer = document.getElementById('activity-log');
        const time = new Date().toLocaleTimeString('ko-KR', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
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
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    }
}

// 전역 봇 인스턴스 생성
const bot = new GoDaddyBot();

// 페이지 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    console.log('GoDaddy 웹 봇이 초기화되었습니다.');
});
