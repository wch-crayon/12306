// ==================== 数据存储 ====================
let stationsDatabase = [];
let trainsDatabase = [];

// ==================== 车型智能判断函数 ====================
function isFuxing(model) {
        if (!model) return false;
        const fuxingModels = ["CR200", "CR220", "CR300", "CR400", "CR450", "复兴号"];
        return fuxingModels.some(fx => model.includes(fx));
}

function isSmartTrain(model) {
        if (!model) return false;
        if (model.includes("CR400")) {
                if (model.includes("-C")) return true;
                if (model.includes("S") || model.includes("E") || model.includes("Z")) return true;
                return false;
        }
        if (model.includes("CR450")) return true;
        return false;
}

function isNormalHighSpeed(model) {
        if (!model) return false;
        const normalModels = ["CRH2C", "CRH3C", "CRH380"];
        return normalModels.some(nh => model.includes(nh));
}

function getTrainBadgeHtml(train) {
        const model = train.model || "";
        const trainNo = train.trainNo || "";
        const isGSeries = trainNo.startsWith("G");
        const isCSeries = trainNo.startsWith("C");
        const isDJSeries = trainNo.startsWith("DJ");
        const isSmart = isSmartTrain(model);
        const isFuxingFlag = isFuxing(model);
        const isNormalHighSpeedFlag = isNormalHighSpeed(model);
        
        let badges = [];
        
        if (isDJSeries) {
                badges.push('<span class="badge badge-dj">✂️ 动检</span>');
        }
        
        if (isGSeries) {
                badges.push('<span class="badge badge-g">🚄 高铁</span>');
        } else if (isCSeries) {
                if (isNormalHighSpeedFlag || model.includes("CR400") || model.includes("CR450")) {
                        badges.push('<span class="badge badge-g">🚄 高铁</span>');
                } else {
                        badges.push('<span class="badge badge-d">🚅 动车</span>');
                }
        } else if (trainNo.startsWith("D")) {
                badges.push('<span class="badge badge-d">🚅 动车</span>');
        } else if (isDJSeries && (model.includes("CR400") || model.includes("CR450"))) {
                badges.push('<span class="badge badge-g">🚄 高铁</span>');
        } else if (isDJSeries) {
                badges.push('<span class="badge badge-d">🚅 动车</span>');
        } else {
                badges.push('<span class="badge badge-d">🚅 动车</span>');
        }
        
        if (isFuxingFlag) {
                badges.push('<span class="badge badge-fx">🎯 复兴号</span>');
        }
        
        if (isSmart) {
                badges.push('<span class="badge badge-smart">✨ 智能动车</span>');
        }
        
        return badges.join(' ');
}

function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
                if (m === '&') return '&amp;';
                if (m === '<') return '&lt;';
                if (m === '>') return '&gt;';
                return m;
        });
}

function updateHiddenSelects() {
        const fromSelect = document.getElementById('fromStation');
        const toSelect = document.getElementById('toStation');
        if (!fromSelect || !toSelect) return;
        
        const cities = [...new Set(stationsDatabase.filter(s => s.city).map(s => s.city))];
        
        let options = '<option value="">请选择出发站/城市</option>';
        
        cities.forEach(city => {
                const cityStations = stationsDatabase.filter(s => s.city === city);
                options += `<option value="CITY_${city}">🏙️ ${city} (城市) - ${cityStations.length}个站</option>`;
        });
        
        stationsDatabase.forEach(s => {
                options += `<option value="${s.name}">🚉 ${s.name}</option>`;
        });
        
        fromSelect.innerHTML = options;
        toSelect.innerHTML = options;
}

function createSearchableSelect(selectId, wrapperId, placeholderText) {
        const select = document.getElementById(selectId);
        const wrapper = document.getElementById(wrapperId);
        if (!select || !wrapper) return;
        
        const getAllOptions = () => {
                return Array.from(select.options).filter(opt => opt.value).map(opt => ({ value: opt.value, text: opt.text }));
        };
        
        let currentValue = select.value;
        let currentText = select.options[select.selectedIndex]?.text || placeholderText;
        
        wrapper.innerHTML = `
                <div class="custom-select-input" id="${selectId}_input">
                        <span id="${selectId}_display">${currentText}</span>
                        <span>▼</span>
                </div>
                <div class="custom-select-dropdown" id="${selectId}_dropdown">
                        <input type="text" class="custom-select-search" id="${selectId}_search" placeholder="🔍 搜索车站或城市..." autocomplete="off">
                        <div class="custom-select-options" id="${selectId}_options"></div>
                </div>
        `;
        
        const inputDiv = document.getElementById(`${selectId}_input`);
        const dropdown = document.getElementById(`${selectId}_dropdown`);
        const searchInput = document.getElementById(`${selectId}_search`);
        const optionsContainer = document.getElementById(`${selectId}_options`);
        const displaySpan = document.getElementById(`${selectId}_display`);
        
        function renderOptions(filterText = '') {
                const kw = filterText.trim().toLowerCase();
                
                if (kw) {
                        const matchedCities = [...new Set(stationsDatabase.filter(s => s.city && s.city.toLowerCase().includes(kw)).map(s => s.city))];
                        const matchedStations = stationsDatabase.filter(s => s.name.toLowerCase().includes(kw));
                        
                        let allOptions = [];
                        
                        matchedCities.forEach(city => {
                                const cityStations = stationsDatabase.filter(s => s.city === city);
                                allOptions.push({
                                        value: `CITY_${city}`,
                                        text: `🏙️ ${city} (城市) - ${cityStations.length}个站`,
                                        isCity: true,
                                        cityName: city
                                });
                        });
                        
                        matchedStations.forEach(station => {
                                if (!matchedCities.includes(station.name)) {
                                        allOptions.push({
                                                value: station.name,
                                                text: `🚉 ${station.name} (车站)`,
                                                isCity: false
                                        });
                                }
                        });
                        
                        if (allOptions.length === 0) {
                                optionsContainer.innerHTML = '<div style="padding:12px; text-align:center; color:#999;">未找到匹配车站或城市</div>';
                                return;
                        }
                        
                        optionsContainer.innerHTML = allOptions.map(opt => `
                                <div class="custom-select-option ${opt.value === currentValue ? 'selected' : ''}" data-value="${opt.value}" data-text="${opt.text.replace(/<[^>]*>/g, '')}" data-iscity="${opt.isCity || false}" data-cityname="${opt.cityName || ''}">
                                        ${opt.text}
                                </div>
                        `).join('');
                        
                        optionsContainer.querySelectorAll('.custom-select-option').forEach(div => {
                                div.addEventListener('click', () => {
                                        const value = div.getAttribute('data-value');
                                        const text = div.getAttribute('data-text');
                                        const isCity = div.getAttribute('data-iscity') === 'true';
                                        const cityName = div.getAttribute('data-cityname');
                                        
                                        if (isCity && cityName) {
                                                select.value = `CITY_${cityName}`;
                                                currentValue = `CITY_${cityName}`;
                                                currentText = cityName;
                                                displaySpan.textContent = `${cityName} (城市)`;
                                        } else {
                                                select.value = value;
                                                currentValue = value;
                                                currentText = text;
                                                displaySpan.textContent = text;
                                        }
                                        dropdown.style.display = 'none';
                                        const changeEvent = new Event('change', { bubbles: true });
                                        select.dispatchEvent(changeEvent);
                                });
                        });
                } else {
                        const cities = [...new Set(stationsDatabase.filter(s => s.city).map(s => s.city))];
                        let allOptions = [];
                        
                        cities.forEach(city => {
                                const cityStations = stationsDatabase.filter(s => s.city === city);
                                allOptions.push({
                                        value: `CITY_${city}`,
                                        text: `🏙️ ${city} (城市) - ${cityStations.length}个站`,
                                        isCity: true,
                                        cityName: city
                                });
                        });
                        
                        stationsDatabase.forEach(station => {
                                allOptions.push({
                                        value: station.name,
                                        text: `🚉 ${station.name} (车站)`,
                                        isCity: false
                                });
                        });
                        
                        if (allOptions.length === 0) {
                                optionsContainer.innerHTML = '<div style="padding:12px; text-align:center; color:#999;">未找到匹配车站</div>';
                                return;
                        }
                        
                        optionsContainer.innerHTML = allOptions.map(opt => `
                                <div class="custom-select-option ${opt.value === currentValue ? 'selected' : ''}" data-value="${opt.value}" data-text="${opt.text.replace(/<[^>]*>/g, '')}" data-iscity="${opt.isCity || false}" data-cityname="${opt.cityName || ''}">
                                        ${opt.text}
                                </div>
                        `).join('');
                        
                        optionsContainer.querySelectorAll('.custom-select-option').forEach(div => {
                                div.addEventListener('click', () => {
                                        const value = div.getAttribute('data-value');
                                        const text = div.getAttribute('data-text');
                                        const isCity = div.getAttribute('data-iscity') === 'true';
                                        const cityName = div.getAttribute('data-cityname');
                                        
                                        if (isCity && cityName) {
                                                select.value = `CITY_${cityName}`;
                                                currentValue = `CITY_${cityName}`;
                                                currentText = cityName;
                                                displaySpan.textContent = `${cityName} (城市)`;
                                        } else {
                                                select.value = value;
                                                currentValue = value;
                                                currentText = text;
                                                displaySpan.textContent = text;
                                        }
                                        dropdown.style.display = 'none';
                                        const changeEvent = new Event('change', { bubbles: true });
                                        select.dispatchEvent(changeEvent);
                                });
                        });
                }
        }
        
        inputDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                const isVisible = dropdown.style.display === 'block';
                dropdown.style.display = isVisible ? 'none' : 'block';
                if (!isVisible) {
                        if (searchInput) {
                                searchInput.value = '';
                                renderOptions('');
                                searchInput.focus();
                        } else {
                                renderOptions('');
                        }
                }
        });
        
        if (searchInput) {
                searchInput.addEventListener('input', () => {
                        renderOptions(searchInput.value);
                });
        }
        
        document.addEventListener('click', () => {
                dropdown.style.display = 'none';
        });
        
        dropdown.addEventListener('click', (e) => e.stopPropagation());
        renderOptions('');
        
        select.addEventListener('change', () => {
            const selectedOpt = select.options[select.selectedIndex];
            if (selectedOpt && selectedOpt.value) {
                currentValue = selectedOpt.value;
                let displayText = selectedOpt.text;
        
                // 去掉选项里的图标和已有后缀
                displayText = displayText.replace(/^[🚉🏙️]\s*/, '');
                displayText = displayText.replace(/\s*\(车站\)\s*/, '');
                displayText = displayText.replace(/\s*\(城市\)\s*/, '');
        
                if (selectedOpt.value.startsWith('CITY_')) {
                    displaySpan.textContent = `${displayText} (城市)`;
                } else {
                    displaySpan.textContent = `${displayText} (车站)`;
                }
            } else {
                displaySpan.textContent = placeholderText;
            }
        });
}

function renderStationList(keyword = '') {
        const container = document.getElementById('stationList');
        if (!container) return;
        
        let filtered = stationsDatabase;
        let isCitySearch = false;
        let cityName = '';
        
        if (keyword.trim()) {
                const kw = keyword.trim().toLowerCase();
                const matchedCities = [...new Set(stationsDatabase.filter(s => s.city && s.city.toLowerCase().includes(kw)).map(s => s.city))];
                
                if (matchedCities.length === 1 && !stationsDatabase.some(s => s.name.toLowerCase() === kw)) {
                        isCitySearch = true;
                        cityName = matchedCities[0];
                        filtered = stationsDatabase.filter(s => s.city === cityName);
                } else {
                        filtered = stationsDatabase.filter(s => s.name.toLowerCase().includes(kw) || (s.city && s.city.toLowerCase().includes(kw)));
                }
        }
        
        container.innerHTML = '';
        
        if (filtered.length === 0) {
                container.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:#8a9bb0;">😔 未找到匹配的车站或城市</div>';
                return;
        }
        
        if (isCitySearch) {
                const cityHeader = document.createElement('div');
                cityHeader.className = 'city-header';
                cityHeader.innerHTML = `🏙️ ${cityName}<span style="font-size:0.7rem; color:#8a9bb0;">(城市)</span>（共${filtered.length}个车站）`;
                container.appendChild(cityHeader);
        }
        
        filtered.forEach(station => {
                const tag = document.createElement('div');
                tag.className = 'station-tag';
                
                if (isCitySearch) {
                        tag.innerHTML = `🚉 ${station.name}<span style="font-size:0.7rem; color:#8a9bb0; margin-left:6px;">(车站)</span>`;
                } else {
                        const isCityMatch = keyword.trim() && station.city && station.city.toLowerCase().includes(keyword.trim().toLowerCase());
                        if (isCityMatch && station.name !== station.city) {
                                tag.innerHTML = `🚉 ${station.name}<span style="font-size:0.7rem; color:#8a9bb0; margin-left:6px;">(${station.city}·车站)</span>`;
                        } else if (station.name === keyword.trim()) {
                                tag.innerHTML = `🚉 ${station.name}<span style="font-size:0.7rem; color:#8a9bb0; margin-left:6px;">(车站)</span>`;
                        } else {
                                tag.innerHTML = `🚉 ${station.name}`;
                        }
                }
                
                tag.addEventListener('click', () => {
                    renderStationSchedule(station.name);
                    document.querySelector('[data-page="train"]').click();
                });
                container.appendChild(tag);
        });
}

function searchTrainsByStations(start, end) {
        if (!start || !end) return { success: false, message: '请选择出发站/城市和到达站/城市' };
        
        const isCityStart = start.startsWith('CITY_');
        const isCityEnd = end.startsWith('CITY_');
        
        let startStations = [];
        let endStations = [];
        
        if (isCityStart) {
                const cityName = start.replace('CITY_', '');
                startStations = stationsDatabase.filter(s => s.city === cityName).map(s => s.name);
        } else {
                startStations = [start];
        }
        
        if (isCityEnd) {
                const cityName = end.replace('CITY_', '');
                endStations = stationsDatabase.filter(s => s.city === cityName).map(s => s.name);
        } else {
                endStations = [end];
        }
        
        if (startStations.length === 0 || endStations.length === 0) {
                return { success: false, message: '未找到匹配的车站' };
        }
        
        const results = [];
        for (const train of trainsDatabase) {
                const stopNames = train.stops.map(s => s.station);
                for (const startStation of startStations) {
                        for (const endStation of endStations) {
                                const startIdx = stopNames.indexOf(startStation);
                                const endIdx = stopNames.indexOf(endStation);
                                if (startIdx !== -1 && endIdx !== -1 && startIdx < endIdx) {
                                        const startStop = train.stops[startIdx];
                                        const endStop = train.stops[endIdx];
                                        results.push({
                                                trainNo: train.trainNo,
                                                type: train.type,
                                                model: train.model,
                                                depot: train.depot,
                                                startStation: startStation,
                                                endStation: endStation,
                                                departTime: startStop.depart,
                                                arriveTime: endStop.arrive,
                                                seats: train.seats || {},
                                                isStart: startIdx === 0,
                                                isEnd: endIdx === train.stops.length - 1
                                        });
                                }
                        }
                }
        }
        
        const uniqueResults = [];
        const seen = new Set();
        for (const r of results) {
                const key = `${r.trainNo}|${r.startStation}|${r.endStation}`;
                if (!seen.has(key)) {
                        seen.add(key);
                        uniqueResults.push(r);
                }
        }
        
        return { success: true, data: uniqueResults };
}

function getStationSchedule(stationName) {
        const schedule = [];

        if (!stationName || !trainsDatabase.length) {
                return schedule;
        }

        for (const train of trainsDatabase) {
                if (!train.stops) continue;
                const stop = train.stops.find(s => s.station === stationName);
                if (!stop) continue;
                schedule.push({
                        trainNo: train.trainNo,
                        type: train.type,
                        model: train.model,
                        depot: train.depot,
                        arriveTime: stop.arrive,
                        departTime: stop.depart,
                        stay: stop.stay,
                        origin: train.startStation,
                        terminal: train.endStation
                });
        }

        schedule.sort((a, b) => {
                const timeA = a.departTime !== '--' ? a.departTime : a.arriveTime;
                const timeB = b.departTime !== '--' ? b.departTime : b.arriveTime;
                return timeA.localeCompare(timeB);
        });

        return schedule;
}

function renderTrainList(trainsList) {
        const area = document.getElementById('trainResultArea');
        if (!area) return;
        if (!trainsList || trainsList.length === 0) {
                area.innerHTML = `<div class="empty-msg">😔 未查询到符合条件的车次，请尝试其他组合</div>`;
                return;
        }
        let html = `<table class="train-table"><thead>
                <th>车次</th><th>类型</th><th>出发站</th><th>路局</th><th>出发时间</th><th>到达站</th><th>到达时间</th><th>剩余席位</th><th>操作</th>
        </thead><tbody>`;
        
        for (const t of trainsList) {
                let seatInfo = '';
                if (Object.keys(t.seats).length > 0) {
                        let items = [];
                        for (let [k, v] of Object.entries(t.seats)) {
                                let seatNameMap = {
                                        'business': '商务座',
                                        'first': '一等座',
                                        'premiumFirst': '优选一等座',
                                        'second': '二等座',
                                        'standing': '无座',
                                        'driverRoom': '司机室',
                                        'pantograph': '受电弓',
                                        'bogie': '转向架',
                                        'catenary': '接触网'
                                };
                                let name = seatNameMap[k] || k;
                                items.push(`${name} ${v}张`);
                        }
                        seatInfo = items.join(' / ');
                } else {
                        seatInfo = '余票充足';
                }
                
                let startTag = '';
                if (t.isStart) {
                        startTag = '<span style="background:#10b981; color:white; font-size:0.65rem; padding:2px 8px; border-radius:20px; margin-left:6px;">始</span>';
                } else {
                        startTag = '<span style="background:#3b82f6; color:white; font-size:0.65rem; padding:2px 8px; border-radius:20px; margin-left:6px;">过</span>';
                }
                
                let endTag = '';
                if (t.isEnd) {
                        endTag = '<span style="background:#ef4444; color:white; font-size:0.65rem; padding:2px 8px; border-radius:20px; margin-left:6px;">终</span>';
                } else {
                        endTag = '<span style="background:#3b82f6; color:white; font-size:0.65rem; padding:2px 8px; border-radius:20px; margin-left:6px;">过</span>';
                }
                
                html += `<tr>
                        <td><strong>${escapeHtml(t.trainNo)}</strong></td>
                        <td>${getTrainBadgeHtml({ model: t.model, type: t.type, trainNo: t.trainNo })}</td>
                        <td>${escapeHtml(t.startStation)}${startTag}</td>
                        <td style="font-size:0.7rem; color:#6c7a8e;">${t.depot ? escapeHtml(t.depot) : '-'}</td>
                        <td>${escapeHtml(t.departTime)}</td>
                        <td>${escapeHtml(t.endStation)}${endTag}</td>
                        <td>${escapeHtml(t.arriveTime)}</td>
                        <td style="font-size:0.8rem;">${seatInfo}</td>
                        <td><button class="search-btn" style="padding:6px 16px;font-size:0.75rem;" data-train="${t.trainNo}">查看详情</button></td>
                <tr>`;
        }
        html += `</tbody></table><div style="margin-top:16px; font-size:0.75rem; color:#6c7a8e;">⭐ 点击查看详情可查看完整停站信息</div>`;
        area.innerHTML = html;
        
        document.querySelectorAll('[data-train]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                        const trainNo = btn.getAttribute('data-train');
                        const train = trainsDatabase.find(t => t.trainNo === trainNo);
                        if (train) {
                                renderTrainDetail(train);
                                document.querySelector('[data-page="train"]').click();
                        } else {
                                alert('未找到车次详情');
                        }
                });
        });
}

function renderTrainDetail(train) {
        const container = document.getElementById('trainByNoResult');
        if (!container) return;
        let stopsHtml = `<table class="train-table" style="margin-top:15px;"><thead><th>车站</th><th>到达时间</th><th>发车时间</th><th>停留时间</th></thead><tbody>`;
        for (const s of train.stops) {
                stopsHtml += `<tr><td>${escapeHtml(s.station)}</td><td>${s.arrive}</td><td>${s.depart}</td><td>${s.stay}分钟</td></tr>`;
        }
        stopsHtml += `</tbody></table>`;
        
        let seatHtml = `<div style="margin-top:16px; background:#f8fafd; padding:12px; border-radius:16px;"><strong>🎫 席位余量</strong><br/>`;
        for (let [k, v] of Object.entries(train.seats)) {
                let seatNameMap = {
                        'business': '商务座',
                        'first': '一等座',
                        'premiumFirst': '优选一等座',
                        'second': '二等座',
                        'standing': '无座',
                        'driverRoom': '司机室',
                        'pantograph': '受电弓',
                        'bogie': '转向架',
                        'catenary': '接触网'
                };
                let name = seatNameMap[k] || k;
                seatHtml += `<span style="margin-right:20px;">${name}: ${v}张</span>`;
        }
        seatHtml += `</div>`;
        
        let depotHtml = train.depot ? `<div style="margin-top:8px; font-size:0.8rem; color:#6c7a8e;">🚩 路局：${escapeHtml(train.depot)}</div>` : '';
        
        let funHtml = '';
        if (train.funFacts && train.funFacts.length > 0) {
                funHtml = `<div style="margin-top: 16px; padding: 16px; background: #fff3e0; border-radius: 20px; border-left: 4px solid #ea580c;">
                        <div style="font-weight: 700; margin-bottom: 10px;">📢 温馨提示</div>
                        <div style="display: flex; flex-wrap: wrap; gap: 12px;">
                                ${train.funFacts.map(f => `<span style="background: #fff0d0; padding: 6px 14px; border-radius: 30px; font-size: 0.8rem;">${escapeHtml(f)}</span>`).join('')}
                        </div>
                </div>`;
        }
        
        container.innerHTML = `<div style="background:#f0f7fc; border-radius:24px; padding:20px;">
                <div style="display:flex; justify-content:space-between; flex-wrap:wrap; align-items:center;">
                        <div><span style="font-size:1.8rem; font-weight:700;">${train.trainNo}</span> ${getTrainBadgeHtml(train)}${depotHtml}</div>
                        <div>${train.startStation} ${train.startTime} → ${train.endStation} ${train.endTime}  全程 ${train.duration}</div>
                </div>
                ${stopsHtml}
                ${seatHtml}
                ${funHtml}
                <div style="margin-top: 20px; padding: 16px; background: #eef2f8; border-radius: 20px;">
                        <div style="font-weight: 700; margin-bottom: 10px;">🚆 车型信息</div>
                        <div style="margin-bottom: 12px;"><strong>${train.model || '未知'}</strong></div>
                        <div style="text-align: center;">
                                <img src="${train.model || 'unknown'}.jpg" alt="${train.model}" style="max-width: 100%; border-radius: 12px;" onerror="this.style.display='none'">
                        </div>
                </div>
        </div>`;
}

function renderStationSchedule(stationName) {
    const container = document.getElementById('trainByNoResult');
    if (!container) return;

    // 获取车站信息
    const stationInfo = stationsDatabase.find(s => s.name === stationName);
    const city = stationInfo ? stationInfo.city : '未知';
    const depot = stationInfo ? stationInfo.depot : '未知';

    const schedule = getStationSchedule(stationName);

    // 先显示车站信息（无论有无车次）
    let html = `<div style="margin-bottom: 20px;">
                    <div style="font-size: 1.4rem; font-weight: 700; color: #1a3a5c;">🚉 ${stationName}</div>
                    <div style="font-size: 0.8rem; color: #8a9bb0; margin-top: 4px;">${city} &nbsp;|&nbsp; 管辖路局：${depot} &nbsp;|&nbsp; 共 ${schedule.length} 趟车次</div>
                </div>`;

    if (!schedule.length) {
        html += `<div class="empty-msg">😔 暂无经停车次</div>`;
        container.innerHTML = html;
        return;
    }

    html += `<table class="train-table"><thead>
                <th>车次</th>
                <th>类型</th>
                <th>到达时间</th>
                <th>发车时间</th>
                <th>停留</th>
                <th>始发站</th>
                <th>终到站</th>
                <th>路局</th>
                <th>操作</th>
            </thead><tbody>`;

    for (const t of schedule) {
        html += `<tr>
                <td><strong>${escapeHtml(t.trainNo)}</strong></td>
                <td>${getTrainBadgeHtml({ model: t.model, type: t.type, trainNo: t.trainNo })}</td>
                <td>${t.arriveTime !== '--' ? t.arriveTime : '-'}</td>
                <td>${t.departTime !== '--' ? t.departTime : '-'}</td>
                <td>${t.stay}分钟</td>
                <td>${escapeHtml(t.origin)}</td>
                <td>${escapeHtml(t.terminal)}</td>
                <td style="font-size:0.7rem;">${t.depot || '-'}</td>
                <td><button class="search-btn" style="padding:4px 12px;font-size:0.7rem;" data-train="${t.trainNo}">查看详情</button></td>
            </tr>`;
    }

    html += `</tbody></table>`;
    container.innerHTML = html;

    // 绑定查看详情按钮事件
    document.querySelectorAll('#trainByNoResult [data-train]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const trainNo = btn.getAttribute('data-train');
            const train = trainsDatabase.find(t => t.trainNo === trainNo);
            if (train) {
                renderTrainDetail(train);
                document.querySelector('[data-page="train"]').click();
            } else {
                alert('未找到车次详情');
            }
        });
    });
}

function searchTrainByNo(trainNo) {
        if (!trainNo) return null;
        return trainsDatabase.find(t => t.trainNo.toUpperCase() === trainNo.toUpperCase()) || null;
}

function handleHomeSearch() {
        const fromSelect = document.getElementById('fromStation');
        const toSelect = document.getElementById('toStation');
        const from = fromSelect ? fromSelect.value : '';
        const to = toSelect ? toSelect.value : '';
        if (!from || !to) {
                alert('请完整选择出发站/城市和到达站/城市');
                return;
        }
        const result = searchTrainsByStations(from, to);
        if (!result.success) {
                document.getElementById('trainResultArea').innerHTML = `<div class="empty-msg">⚠️ ${result.message}</div>`;
        } else {
                renderTrainList(result.data);
        }
}

function setDefaultDate() {
        const dateInput = document.getElementById('travelDate');
        if (dateInput) {
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                dateInput.value = `${yyyy}-${mm}-${dd}`;
        }
}

function initNavigation() {
        const btns = document.querySelectorAll('.nav-btn-white');
        const pages = {
                home: document.getElementById('homePage'),
                station: document.getElementById('stationPage'),
                train: document.getElementById('trainPage'),
                about: document.getElementById('aboutPage')
        };
        btns.forEach(btn => {
                btn.addEventListener('click', () => {
                        const pageName = btn.getAttribute('data-page');
                        btns.forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        Object.values(pages).forEach(p => p.classList.remove('active-page'));
                        if (pageName === 'home') pages.home.classList.add('active-page');
                        if (pageName === 'station') { pages.station.classList.add('active-page'); renderStationList(''); }
                        if (pageName === 'train') pages.train.classList.add('active-page');
                        if (pageName === 'about') pages.about.classList.add('active-page');
                });
        });
}

async function loadData() {
        try {
                // 加载车站数据
                const stationsResponse = await fetch('stations.json');
                if (stationsResponse.ok) {
                        stationsDatabase = await stationsResponse.json();
                        console.log(`✅ 已加载 ${stationsDatabase.length} 个车站`);
                } else {
                        console.warn('⚠️ stations.json 加载失败');
                }
                
                // 加载车次数据
                const trainsResponse = await fetch('TrainNumbers.json');
                if (trainsResponse.ok) {
                        trainsDatabase = await trainsResponse.json();
                        console.log(`✅ 已加载 ${trainsDatabase.length} 个车次`);
                } else {
                        console.warn('⚠️ TrainNumbers.json 加载失败');
                }
                
                // 加载路局简介
                const aboutResponse = await fetch('railways.html');
                if (aboutResponse.ok) {
                        const aboutHtml = await aboutResponse.text();
                        document.getElementById('aboutPage').innerHTML = aboutHtml;
                        console.log('✅ 已加载路局简介');
                } else {
                        console.warn('⚠️ railways.html 加载失败');
                }
                
                updateHiddenSelects();
                createSearchableSelect('fromStation', 'fromStationWrapper', '请选择出发站/城市');
                createSearchableSelect('toStation', 'toStationWrapper', '请选择到达站/城市');
                renderStationList('');
                setDefaultDate();
                initNavigation();

                const searchBtn = document.getElementById('searchTrainsBtn');
                if (searchBtn) searchBtn.addEventListener('click', handleHomeSearch);

                const searchTrainNoBtn = document.getElementById('searchByTrainNoBtn');
                const trainNoInput = document.getElementById('trainNoInput');
                if (searchTrainNoBtn) {
                        searchTrainNoBtn.addEventListener('click', () => {
                                const no = trainNoInput.value.trim();
                                if (!no) { alert('请输入车次号'); return; }
                                const train = searchTrainByNo(no);
                                renderTrainDetail(train);
                        });
                }
                if (trainNoInput) {
                        trainNoInput.addEventListener('keypress', (e) => {
                                if (e.key === 'Enter') searchTrainNoBtn.click();
                        });
                }

                const stationSearchInput = document.getElementById('stationSearchInput');
                if (stationSearchInput) {
                        stationSearchInput.addEventListener('input', () => {
                                renderStationList(stationSearchInput.value);
                        });
                }

                document.getElementById('trainResultArea').innerHTML = `<div style="text-align:center; padding:40px; color:#8a9bb0;">✨ 请选择始发站/城市和到达站/城市后点击查询 ✨</div>`;
                
                window.__MCRAILWAY_DB = {
                        stations: stationsDatabase,
                        trains: trainsDatabase,
                        updateStations: (newStations) => { stationsDatabase = newStations; updateHiddenSelects(); renderStationList(''); },
                        updateTrains: (newTrains) => { trainsDatabase = newTrains; },
                        addTrain: (train) => { trainsDatabase.push(train); },
                        addStation: (station) => { stationsDatabase.push(station); updateHiddenSelects(); renderStationList(''); }
                };
                console.log('✅ MC铁路12306已加载');
                
        } catch (error) {
                console.error('❌ 数据加载失败:', error);
        }
}

loadData();