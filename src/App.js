import React, { useState, useMemo, useEffect } from 'react';
import { 
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import { 
  MapPin, Calendar as CalendarIcon, Clock, Compass, Info, 
  Moon, Star, Cloud, AlertCircle, Sparkles, Sunrise, Sunset,
  ChevronDown, ChevronLeft, ChevronRight, Navigation, X
} from 'lucide-react';

// --- [Constants & Helpers] ---
const TODAY = new Date(2026, 3, 10); // 2026년 4월 10일 기준

const POPULAR_SPOTS = [
  { name: "강원 강릉시 안반데기", nx: 94, ny: 133 },
  { name: "경남 합천군 황매산", nx: 86, ny: 86 },
  { name: "충북 청주시 봉명동", nx: 69, ny: 107 },
  { name: "제주 서귀포시 1100고지", nx: 52, ny: 34 }
];

// 월령 계산 로직 (신월: 2026/04/17)
const getMoonData = (date) => {
  const newMoon = new Date(2026, 3, 17);
  const diffDays = Math.floor((date - newMoon) / (1000 * 60 * 60 * 24));
  const cycle = 29.53;
  const age = ((diffDays % cycle) + cycle) % cycle;
  if (age < 2 || age > 27.5) return { name: '신월', icon: '🌑', illumination: 0 };
  if (age < 7) return { name: '초승달', icon: '🌒', illumination: 25 };
  if (age < 14) return { name: '상현달', icon: '🌓', illumination: 50 };
  if (age < 16) return { name: '보름달', icon: '🌕', illumination: 100 };
  if (age < 22) return { name: '하현달', icon: '🌗', illumination: 50 };
  return { name: '그믐달', icon: '🌘', illumination: 15 };
};

const generateDayInfo = (date) => {
  const moon = getMoonData(date);
  const diffFromToday = Math.floor((date - TODAY) / (1000 * 60 * 60 * 24));
  const hasForecast = diffFromToday >= -1 && diffFromToday <= 10;
  const cloudBase = hasForecast ? (Math.random() * 100) : null;
  const score = cloudBase !== null ? Math.max(0, Math.round(100 - (moon.illumination * 0.6) - (cloudBase * 0.4))) : 0;

  return {
    date: new Date(date),
    moon, score,
    weather: cloudBase === null ? null : cloudBase < 30 ? '맑음' : cloudBase < 70 ? '구름조금' : '흐림',
    hourly: hasForecast ? Array.from({ length: 9 }).map((_, j) => ({
      time: j + 21 > 24 ? `0${j + 21 - 24}:00` : `${j + 21}:00`,
      clouds: Math.max(0, Math.min(100, cloudBase + (Math.random() * 20 - 10))),
      temp: 12 - (j * 0.8),
      dust: 30 + Math.random() * 20
    })) : []
  };
};

export default function App() {
  const [viewDate, setViewDate] = useState(new Date(2026, 3, 1)); 
  const [selectedDate, setSelectedDate] = useState(new Date(2026, 3, 10));
  const [location, setLocation] = useState(POPULAR_SPOTS[2]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 나침반 관련 상태
  const [heading, setHeading] = useState(0); 
  const [isCompassActive, setIsCompassActive] = useState(false);

  // 나침반 권한 요청 및 실행
  const startCompass = async () => {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation);
          setIsCompassActive(true);
        }
      } catch (e) { alert("센서 접근이 거부되었습니다."); }
    } else {
      window.addEventListener('deviceorientation', handleOrientation);
      setIsCompassActive(true);
    }
  };

  const handleOrientation = (e) => {
    const compass = e.webkitCompassHeading || (360 - e.alpha);
    setHeading(Math.round(compass));
  };

  useEffect(() => {
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, []);

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= lastDate; d++) days.push(generateDayInfo(new Date(year, month, d)));
    return days;
  }, [viewDate]);

  const activeData = useMemo(() => generateDayInfo(selectedDate), [selectedDate]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-6 font-sans selection:bg-purple-500/30">
      {/* Header */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
            <Sparkles className="text-blue-400" size={28} /> 은하수 추적기
          </h1>
          <button onClick={() => setIsModalOpen(true)} className="text-slate-300 mt-2 flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-700 transition-all">
            <MapPin size={16} className="text-blue-400" /> {location.name} <ChevronDown size={14} />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* 모바일 1순위: 점수 & 차트 (lg:order-2) */}
        <div className="lg:col-span-7 flex flex-col gap-6 order-1 lg:order-2">
          <section className="flex flex-col md:flex-row gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex-1 flex items-center gap-5">
              <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="40" cy="40" r="36" className="stroke-slate-800 fill-none" strokeWidth="8" />
                  <circle cx="40" cy="40" r="36" className={`fill-none transition-all duration-1000 ${activeData.score >= 70 ? 'stroke-emerald-500' : 'stroke-yellow-500'}`} strokeWidth="8" strokeDasharray="226" strokeDashoffset={226 - (226 * activeData.score / 100)} strokeLinecap="round" />
                </svg>
                <span className="absolute text-2xl font-black">{activeData.score}</span>
              </div>
              <div>
                <h3 className="text-slate-400 text-sm font-medium">{selectedDate.toLocaleDateString()} 지수</h3>
                <p className="text-xl font-bold text-white">{activeData.score >= 70 ? '관측 최적! 🤩' : activeData.score >= 40 ? '무난함 🙂' : '관측 비추 😥'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 flex-1">
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-500 flex items-center gap-1"><Moon size={12}/> 월령</div>
                <div className="font-bold text-sm md:text-base">{activeData.moon.name} ({activeData.moon.illumination}%)</div>
              </div>
              {/* 나침반 카드 */}
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 relative overflow-hidden group">
                <div className="text-xs text-slate-500 flex items-center gap-1"><Compass size={12} className="text-purple-400"/> 관측 방향</div>
                <div className="flex items-center justify-between mt-1">
                  <div className="font-bold text-sm">남동쪽 (160°)</div>
                  <button 
                    onClick={startCompass}
                    className={`p-1.5 rounded-md transition-all ${isCompassActive ? 'bg-purple-500 text-white animate-pulse' : 'bg-slate-800 text-purple-400 border border-slate-700 hover:border-purple-500'}`}
                  >
                    <Navigation size={14} style={{ transform: `rotate(${isCompassActive ? heading : 0}deg)` }} />
                  </button>
                </div>
                {isCompassActive && <div className="absolute bottom-1 right-2 text-[8px] text-purple-400">내 방향: {heading}°</div>}
              </div>
            </div>
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg h-72 md:h-80">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Cloud className="text-blue-400" size={20} /> 시간대별 예보 추이</h2>
            {activeData.hourly.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={activeData.hourly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{backgroundColor:'#1e293b', border:'none', borderRadius:'8px'}} />
                  <Area type="monotone" dataKey="clouds" name="구름" fill="#3b82f6" fillOpacity={0.2} stroke="#3b82f6" strokeWidth={2} />
                  <Line type="monotone" dataKey="temp" name="기온" stroke="#10b981" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm">
                <Info size={24} className="mb-2 opacity-20" />
                <p>예보 데이터가 없는 날짜입니다.</p>
              </div>
            )}
          </section>
        </div>

        {/* 모바일 2순위: 달력 (lg:order-1) */}
        <div className="lg:col-span-5 flex flex-col gap-6 order-2 lg:order-1">
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <CalendarIcon size={20} className="text-blue-400" />
                {viewDate.getFullYear()}년 {viewDate.getMonth() + 1}월
              </h2>
              <div className="flex gap-1">
                <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400"><ChevronLeft size={20}/></button>
                <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400"><ChevronRight size={20}/></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-500 mb-2 uppercase font-bold tracking-widest">
              <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map((data, idx) => {
                if (!data) return <div key={`empty-${idx}`} className="aspect-square" />;
                const isSelected = selectedDate.toDateString() === data.date.toDateString();
                const isToday = TODAY.toDateString() === data.date.toDateString();
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(data.date)}
                    className={`relative aspect-square rounded-xl flex flex-col items-center justify-center transition-all border ${isSelected ? 'bg-blue-600 border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-slate-800/40 border-slate-800 hover:border-slate-600'}`}
                  >
                    <span className={`text-[10px] font-bold mb-1 ${isToday ? 'text-emerald-400' : 'text-slate-400'}`}>{data.date.getDate()}</span>
                    <span className="text-base leading-none">{data.moon.icon}</span>
                    <div className={`absolute bottom-0 w-1/2 h-0.5 rounded-full ${data.score >= 70 ? 'bg-emerald-500' : data.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'} mb-1.5`} />
                  </button>
                );
              })}
            </div>
          </section>

          <section className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 rounded-2xl p-5">
            <h2 className="text-sm font-bold flex items-center gap-2 mb-3 text-indigo-300"><AlertCircle size={16}/> 관측 가이드</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              은하수 중심부는 4월 기준 새벽 2시경 남동쪽에서 떠오릅니다. 나침반 모드를 켜고 160도 방향을 확인하세요!
            </p>
          </section>
        </div>
      </main>

      {/* Location Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-slate-800">
              <h2 className="text-lg font-bold">지역 선택</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400"><X size={24} /></button>
            </div>
            <div className="p-4 grid gap-2">
              {POPULAR_SPOTS.map((spot, idx) => (
                <button key={idx} onClick={() => { setLocation(spot); setIsModalOpen(false); }} className={`w-full text-left p-4 rounded-2xl transition-all ${location.name === spot.name ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                  {spot.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}