import React, { useState, useMemo, useEffect } from 'react';
import { 
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import { 
  MapPin, Calendar as CalendarIcon, Clock, Compass, Info, 
  Moon, Star, Cloud, AlertCircle, Sparkles, Sunrise, Sunset,
  Search, X, Map, ChevronDown
} from 'lucide-react';

// --- [Constants & Mocks] ---
const DAYS_IN_MONTH = 30;
const START_DAY_OFFSET = 3; // 2026년 4월 1일은 수요일
const TODAY_DATE = 8; // 시뮬레이션 기준 오늘 (4월 8일)

const POPULAR_SPOTS = [
  { name: "강원 강릉시 안반데기", nx: 94, ny: 133 },
  { name: "경남 합천군 황매산", nx: 86, ny: 86 },
  { name: "충북 청주시 봉명동", nx: 69, ny: 107 },
  { name: "제주 서귀포시 1100고지", nx: 52, ny: 34 }
];

// --- [Helper Functions] ---
const getMoonPhase = (day) => {
  const newMoonDay = 17; // 4월 17일 신월 기준
  const diff = Math.abs(day - newMoonDay);
  if (diff <= 2) return { name: '그믐/신월', icon: '🌑', illumination: diff * 3 };
  if (diff <= 6) return { name: '초승/그믐달', icon: '🌒', illumination: diff * 8 };
  if (diff <= 10) return { name: '상현/하현', icon: '🌓', illumination: 50 };
  if (diff <= 13) return { name: '보름달 근처', icon: '🌔', illumination: 85 };
  return { name: '보름달(망)', icon: '🌕', illumination: 100 };
};

const getWeatherIcon = (weather) => {
  if (weather === '맑음') return '☀️';
  if (weather === '구름조금') return '⛅';
  if (weather === '흐림') return '☁️';
  return '-';
};

// 기본 캘린더/천문 데이터 생성 (API 호출 전 기본 틀)
const generateBaseCalendarData = () => {
  return Array.from({ length: DAYS_IN_MONTH }).map((_, i) => {
    const day = i + 1;
    const moon = getMoonPhase(day);
    
    // 임의의 출몰 시간 (실제 서비스에서는 천문연구원 API 연동 필요)
    const sunRise = `06:${String(15 - Math.floor(day/3)).padStart(2, '0')}`;
    const sunSet = `19:${String(10 + Math.floor(day/2)).padStart(2, '0')}`;
    const moonAge = (day - 17 + 30) % 30; 
    const moonRiseHour = Math.floor((6 + (moonAge * 24 / 30)) % 24);
    const moonSetHour = Math.floor((18 + (moonAge * 24 / 30)) % 24);
    
    // 시뮬레이션용 기상 데이터 (10일 뒤까지만 예보 제공)
    const isForecastAvailable = day >= TODAY_DATE && day <= TODAY_DATE + 10;
    const isGoodWeather = day >= 14 && day <= 19; 
    const cloudBase = isForecastAvailable ? (isGoodWeather ? 10 : 40 + Math.random() * 40) : null;
    const weatherStatus = isForecastAvailable ? (cloudBase < 30 ? '맑음' : cloudBase < 70 ? '구름조금' : '흐림') : null;
    const score = cloudBase !== null ? Math.max(0, Math.round(100 - (moon.illumination * 0.6) - (cloudBase * 0.4))) : 0;

    return {
      day,
      isToday: day === TODAY_DATE,
      moon, sunRise, sunSet,
      moonRise: `${String(moonRiseHour).padStart(2, '0')}:30`,
      moonSet: `${String(moonSetHour).padStart(2, '0')}:30`,
      score,
      isOptimal: score >= 75,
      weather: weatherStatus,
      // 시간대별 차트용 더미 데이터
      hourly: isForecastAvailable ? Array.from({ length: 9 }).map((_, j) => {
        const time = j + 21; 
        return {
          time: time > 24 ? `0${time - 24}:00` : `${time}:00`,
          clouds: Math.max(0, Math.min(100, cloudBase + (Math.random() * 20 - 10))),
          dust: Math.max(10, Math.min(100, 30 + (Math.random() * 15 - 5))), 
          temp: 12 - (j * 0.8) + (Math.random() * 2 - 1), 
        };
      }) : []
    };
  });
};


// --- [Main Component] ---
export default function MilkyWayDashboard() {
  const [location, setLocation] = useState(POPULAR_SPOTS[2]); // 기본값: 청주시 봉명동
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDay, setSelectedDay] = useState(TODAY_DATE); 
  const [calendarData, setCalendarData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // 컴포넌트 마운트 및 지역 변경 시 데이터 갱신
  useEffect(() => {
    // 1. 천문 기본 데이터 로드 (동기)
    const baseData = generateBaseCalendarData();
    setCalendarData(baseData);

    // 2. 기상청 실제 API 연동 로직 (현재는 주석 처리된 스켈레톤, .env 설정 후 활성화)
    const fetchRealWeather = async () => {
      /*
      setIsLoading(true);
      try {
        const API_KEY = process.env.REACT_APP_KMA_API_KEY; // .env에서 키 가져오기
        const todayStr = '20260408'; // 실제 구동 시 YYYYMMDD 포맷팅 함수 필요
        const url = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=${API_KEY}&pageNo=1&numOfRows=200&dataType=JSON&base_date=${todayStr}&base_time=0500&nx=${location.nx}&ny=${location.ny}`;
        
        const response = await fetch(url);
        const json = await response.json();
        
        // TODO: json.response.body.items.item 에서 SKY(하늘상태), TMP(기온)를 파싱하여
        // baseData 배열의 hourly 데이터를 덮어씌우는 로직 작성
        
      } catch (error) {
        console.error("API 연동 에러:", error);
      } finally {
        setIsLoading(false);
      }
      */
    };

    fetchRealWeather();
  }, [location]);

  const activeData = useMemo(() => calendarData.find(d => d.day === selectedDay) || {}, [selectedDay, calendarData]);

  // 차트 툴팁 커스터마이징
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-700 p-3 rounded-lg shadow-xl">
          <p className="text-slate-200 font-bold mb-1">{label}</p>
          {payload.map((entry, index) => {
            let unit = entry.dataKey === 'clouds' ? '%' : entry.dataKey === 'dust' ? ' µg/m³' : '°C';
            return (
              <p key={index} style={{ color: entry.color }} className="text-sm">
                {entry.name}: {entry.value.toFixed(1)}{unit}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  if (!calendarData.length) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">데이터 로딩 중...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-6 font-sans selection:bg-blue-500/30">
      
      {/* --- Header --- */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
            <Sparkles className="text-blue-400" size={28} />
            은하수 추적기 대시보드
          </h1>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="text-slate-300 mt-2 flex items-center gap-2 hover:text-white transition-colors bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500"
          >
            <MapPin size={16} className="text-blue-400" /> 
            {location.name} · 2026년 4월
            <ChevronDown size={14} />
          </button>
        </div>
        <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 px-4 py-2 rounded-full text-sm">
          <span className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-500' : 'bg-emerald-500'} shadow-[0_0_8px_#10b981]`}></div> 
            {isLoading ? '데이터 갱신 중...' : 'API 연동 대기 (시뮬레이션 모드)'}
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* --- Left Column: Calendar & Events --- */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <CalendarIcon size={20} className="text-blue-400" />
                4월 관측 캘린더
              </h2>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-sm mb-2 text-slate-500 font-medium">
              <div>일</div><div>월</div><div>화</div><div>수</div><div>목</div><div>금</div><div>토</div>
            </div>
            <div className="grid grid-cols-7 gap-1 lg:gap-2">
              {Array.from({ length: START_DAY_OFFSET }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square p-1"></div>
              ))}
              {calendarData.map((data) => (
                <button
                  key={data.day}
                  onClick={() => setSelectedDay(data.day)}
                  className={`
                    relative aspect-square flex flex-col p-1.5 sm:p-2 rounded-xl transition-all overflow-hidden
                    ${selectedDay === data.day ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)] border-transparent' : 'bg-slate-800/50 border border-slate-700 hover:bg-slate-700'}
                    ${data.isOptimal && selectedDay !== data.day ? 'border-blue-500/50 bg-blue-500/10' : ''}
                    ${data.isToday && selectedDay !== data.day ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-900' : ''}
                  `}
                >
                  <div className="w-full flex justify-between items-start z-10">
                    <span className={`text-[10px] sm:text-xs font-bold ${selectedDay === data.day ? 'text-white' : data.isToday ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {data.day}{data.isToday ? ' (오늘)' : ''}
                    </span>
                    <span className="text-[10px] sm:text-xs leading-none text-slate-300" title={data.weather || "예보 없음"}>
                      {getWeatherIcon(data.weather)}
                    </span>
                  </div>
                  <div className="flex-1 flex items-center justify-center w-full z-10">
                    <span className="text-lg sm:text-2xl filter drop-shadow-md">{data.moon?.icon}</span>
                  </div>
                  <div className={`absolute bottom-0 left-0 right-0 h-1 sm:h-1.5 opacity-90 ${data.score >= 75 ? 'bg-emerald-500' : data.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                </button>
              ))}
            </div>
          </section>

          <section className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-indigo-300">
              <AlertCircle size={20} />
              이달의 주요 천문 이벤트
            </h2>
            <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50 relative z-10">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-white text-lg">거문고자리 유성우 극대기</h3>
                <span className="bg-indigo-500 text-white text-xs px-2 py-1 rounded-md font-bold">4.22 예측</span>
              </div>
              <p className="text-sm text-slate-300 mb-1 leading-relaxed">
                시간당 약 15~20개의 유성이 떨어질 것으로 예상됩니다. 은하수 타임랩스 촬영 시 훌륭한 부가 피사체가 될 수 있습니다.
              </p>
            </div>
          </section>
        </div>

        {/* --- Right Column: Details & Charts --- */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <section className="flex flex-col md:flex-row gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex-1 flex items-center gap-5">
              <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="40" cy="40" r="36" className="stroke-slate-700 fill-none" strokeWidth="8" />
                  <circle 
                    cx="40" cy="40" r="36" 
                    className={`fill-none transition-all duration-1000 ${activeData.score >= 75 ? 'stroke-emerald-500' : activeData.score >= 40 ? 'stroke-yellow-500' : 'stroke-red-500'}`} 
                    strokeWidth="8" 
                    strokeDasharray={`${2 * Math.PI * 36}`}
                    strokeDashoffset={`${2 * Math.PI * 36 * (1 - (activeData.score || 0) / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-extrabold">{activeData.score || 0}</span>
                </div>
              </div>
              <div>
                <h3 className="text-slate-400 text-sm font-medium mb-1">4월 {activeData.day}일 관측 지수</h3>
                <p className="text-2xl font-bold text-white mb-1">
                  {!activeData.weather ? '예측 불가 🌫️' : activeData.score >= 80 ? '매우 좋음 🤩' : activeData.score >= 60 ? '좋음 🙂' : activeData.score >= 40 ? '보통 😐' : '나쁨 😥'}
                </p>
                <p className="text-xs text-slate-500">달빛 {activeData.moon?.illumination}% / 기상 예보 연동</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 flex-1">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-lg flex flex-col justify-center">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-1"><Clock size={16} className="text-blue-400" /> 최적 시간</div>
                <div className="text-base font-bold">02:30 ~ 04:30</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-lg flex flex-col justify-center">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-1"><Compass size={16} className="text-purple-400" /> 관측 방향</div>
                <div className="text-base font-bold">남동쪽 (궁수자리)</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-lg flex flex-col justify-center">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-1"><Sunrise size={16} className="text-orange-400" /> 일출 / 일몰</div>
                <div className="text-base font-bold">{activeData.sunRise} / {activeData.sunSet}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-lg flex flex-col justify-center">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-1"><Moon size={16} className="text-yellow-400" /> 월출 / 월몰</div>
                <div className="text-base font-bold">{activeData.moonRise} / {activeData.moonSet}</div>
              </div>
            </div>
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex-1 flex flex-col min-h-[300px]">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Cloud size={20} className="text-blue-400" /> 시간대별 기상 추이
                </h2>
              </div>
            </div>

            {activeData.hourly && activeData.hourly.length > 0 ? (
              <div className="w-full flex-1 relative min-h-[200px]">
                <div className="absolute inset-y-0 left-[55%] right-[22%] bg-purple-500/10 border-x border-purple-500/30 border-dashed z-0 pointer-events-none flex justify-center pt-2">
                  <span className="text-[10px] text-purple-400 font-bold bg-slate-900/80 px-2 py-0.5 rounded h-fit">관측 최적기</span>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={activeData.hourly} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                    <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 150]} hide />
                    <YAxis yAxisId="temp" orientation="right" stroke="#10b981" fontSize={12} tickLine={false} axisLine={false} domain={[-5, 25]} tickFormatter={(val) => `${val}°C`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                    <Area yAxisId="left" type="monotone" dataKey="clouds" name="구름 양 (%)" stroke="#3b82f6" fillOpacity={0.3} fill="#3b82f6" strokeWidth={2} />
                    <Line yAxisId="temp" type="monotone" dataKey="temp" name="기온 (°C)" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#0f172a', strokeWidth: 2 }} activeDot={{ r: 5 }} />
                    <Line yAxisId="right" type="monotone" dataKey="dust" name="미세먼지 (µg/m³)" stroke="#fb923c" strokeWidth={2} dot={{ r: 3, fill: '#0f172a', strokeWidth: 2 }} activeDot={{ r: 5 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="w-full flex-1 flex flex-col items-center justify-center text-slate-500 min-h-[200px]">
                <Info size={32} className="mb-2 opacity-50" />
                <p>해당 일자의 기상청 예보 데이터가 없습니다.</p>
                <p className="text-xs mt-1">단기/중기 예보는 오늘 기준 최대 10일 후까지만 제공됩니다.</p>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* --- Location Selection Modal --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-800/30">
              <h2 className="text-lg font-bold flex items-center gap-2 text-white"><MapPin size={20} className="text-blue-400" /> 관측 지역 선택</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1"><X size={20} /></button>
            </div>
            <div className="p-5 flex flex-col gap-5">
              <div>
                <h3 className="text-xs font-bold text-slate-500 mb-3">추천 은하수 관측 명소</h3>
                <div className="grid grid-cols-2 gap-2">
                  {POPULAR_SPOTS.map((spot, idx) => (
                    <button
                      key={idx}
                      onClick={() => { 
                        setLocation(spot); 
                        setIsModalOpen(false); 
                      }}
                      className={`text-left bg-slate-800 border text-sm p-3 rounded-xl transition-all ${location.name === spot.name ? 'border-blue-500 text-white bg-blue-600/20' : 'border-slate-700 hover:border-slate-500 text-slate-300'}`}
                    >
                      {spot.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}