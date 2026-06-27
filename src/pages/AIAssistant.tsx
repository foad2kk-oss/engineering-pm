import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { useData } from '../contexts/DataContext';
import { Bot, Send, Sparkles, BarChart3, Users, AlertTriangle, FileText, Lightbulb } from 'lucide-react';
import type { Project, Engineer } from '../types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const quickPrompts = [
  { icon: <BarChart3 size={14} />, label: { en: 'Analyze project schedule', ar: 'حلل جدول المشاريع' } },
  { icon: <Users size={14} />, label: { en: 'Detect overloaded engineers', ar: 'اكتشف المهندسين المثقلين' } },
  { icon: <AlertTriangle size={14} />, label: { en: 'Predict project delays', ar: 'توقع تأخيرات المشاريع' } },
  { icon: <FileText size={14} />, label: { en: 'Generate weekly report', ar: 'أنشئ تقرير أسبوعي' } },
  { icon: <Lightbulb size={14} />, label: { en: 'Suggest workload optimization', ar: 'اقترح توزيع أفضل للعمل' } },
];

function generateResponse(query: string, lang: 'ar' | 'en', projects: Project[], engineers: Engineer[]): string {
  const q = query.toLowerCase();
  const delayed    = projects.filter(p => p.status === 'delayed');
  const overloaded = engineers.filter(e => e.utilization >= 90);
  const atRisk     = projects.filter(p => p.status === 'at-risk');

  if (projects.length === 0 && engineers.length === 0) {
    return lang === 'ar'
      ? '📭 لا توجد بيانات بعد. أضف مشاريع ومهندسين أولاً ثم اسألني مجدداً!'
      : '📭 No data yet. Please add projects and engineers first, then ask me again!';
  }

  if (q.includes('delay') || q.includes('تأخير') || q.includes('متأخر')) {
    if (lang === 'ar') {
      return `🔍 **تحليل التأخيرات:**\n\n${delayed.length > 0
        ? `وجدت ${delayed.length} مشروع متأخر:\n${delayed.map(p => `• **${p.nameAr}**: التقدم ${p.progress}% - الموعد ${p.deadline}`).join('\n')}`
        : 'لا توجد مشاريع متأخرة حالياً ✅'}\n\n${atRisk.length > 0 ? `⚠️ مشاريع في خطر (${atRisk.length}):\n${atRisk.map(p => `• ${p.nameAr}`).join('\n')}` : ''}\n\n💡 **توصيات:**\n• مراجعة توزيع المهام على المهندسين\n• النظر في تمديد المواعيد النهائية\n• إضافة موارد إضافية للمشاريع المتأخرة`;
    }
    return `🔍 **Delay Analysis:**\n\n${delayed.length > 0
      ? `Found ${delayed.length} delayed project(s):\n${delayed.map(p => `• **${p.name}**: ${p.progress}% complete - Due ${p.deadline}`).join('\n')}`
      : 'No delayed projects currently ✅'}\n\n${atRisk.length > 0 ? `⚠️ At-risk projects (${atRisk.length}):\n${atRisk.map(p => `• ${p.name}`).join('\n')}` : ''}\n\n💡 **Recommendations:**\n• Review task distribution among engineers\n• Consider extending deadlines where feasible\n• Add resources to delayed projects`;
  }

  if (q.includes('overload') || q.includes('مثقل') || q.includes('محمّل') || q.includes('engineer') || q.includes('مهندس')) {
    const avgUtil = engineers.length ? Math.round(engineers.reduce((s, e) => s + e.utilization, 0) / engineers.length) : 0;
    if (lang === 'ar') {
      return `👥 **تحليل طاقة المهندسين:**\n\n${overloaded.length > 0
        ? `⚠️ مهندسون محمّلون بشكل زائد (${overloaded.length}):\n${overloaded.map(e => `• **${e.nameAr || e.name}** (${e.department}): ${e.utilization}%`).join('\n')}`
        : 'لا يوجد مهندسون محمّلون زيادة ✅'}\n\n📊 **متوسط الاستخدام:** ${avgUtil}%\n\n💡 **توصيات:**\n• توزيع مهام من المهندسين المثقلين إلى من لديهم طاقة فائضة\n• النظر في تعيين مهندسين إضافيين\n• مراجعة أولويات المشاريع`;
    }
    return `👥 **Engineer Capacity Analysis:**\n\n${overloaded.length > 0
      ? `⚠️ Overloaded engineers (${overloaded.length}):\n${overloaded.map(e => `• **${e.name}** (${e.department}): ${e.utilization}%`).join('\n')}`
      : 'No overloaded engineers ✅'}\n\n📊 **Average Utilization:** ${avgUtil}%\n\n💡 **Recommendations:**\n• Redistribute tasks from overloaded to available engineers\n• Consider hiring additional engineers\n• Review project priorities`;
  }

  if (q.includes('report') || q.includes('تقرير')) {
    const totalH = projects.reduce((s, p) => s + p.totalHours, 0);
    const doneH  = projects.reduce((s, p) => s + p.completedHours, 0);
    const avgUtil = engineers.length ? Math.round(engineers.reduce((s, e) => s + e.utilization, 0) / engineers.length) : 0;
    if (lang === 'ar') {
      return `📋 **التقرير الأسبوعي**\n\n🏗️ **المشاريع:**\n• إجمالي المشاريع: ${projects.length}\n• مشاريع جارية: ${projects.filter(p => p.status !== 'completed').length}\n• مشاريع مكتملة: ${projects.filter(p => p.status === 'completed').length}\n• مشاريع متأخرة: ${delayed.length}\n\n⏱️ **الساعات:**\n• المخططة: ${totalH}\n• المنجزة: ${doneH}\n• نسبة الإنجاز: ${totalH ? Math.round(doneH / totalH * 100) : 0}%\n\n👥 **المهندسون:**\n• إجمالي: ${engineers.length}\n• متوسط الاستخدام: ${avgUtil}%`;
    }
    return `📋 **Weekly Report**\n\n🏗️ **Projects:**\n• Total: ${projects.length}\n• Running: ${projects.filter(p => p.status !== 'completed').length}\n• Completed: ${projects.filter(p => p.status === 'completed').length}\n• Delayed: ${delayed.length}\n\n⏱️ **Hours:**\n• Planned: ${totalH}\n• Completed: ${doneH}\n• Completion rate: ${totalH ? Math.round(doneH / totalH * 100) : 0}%\n\n👥 **Engineers:**\n• Total: ${engineers.length}\n• Avg Utilization: ${avgUtil}%`;
  }

  if (q.includes('schedule') || q.includes('جدول') || q.includes('analyz')) {
    const onTime = projects.filter(p => p.status === 'on-time');
    if (lang === 'ar') {
      return `📅 **تحليل الجدول الزمني:**\n\n✅ في الموعد: ${onTime.length}\n⚠️ في خطر: ${atRisk.length}\n🔴 متأخرة: ${delayed.length}\n🔵 مكتملة: ${projects.filter(p => p.status === 'completed').length}\n\n${projects.length > 0 ? `📊 **تقدم المشاريع:**\n${projects.map(p => `• ${p.nameAr}: ${p.progress}%`).join('\n')}` : ''}\n\n💡 ركز على المشاريع في خطر لمنع التأخير.`;
    }
    return `📅 **Schedule Analysis:**\n\n✅ On time: ${onTime.length}\n⚠️ At risk: ${atRisk.length}\n🔴 Delayed: ${delayed.length}\n🔵 Completed: ${projects.filter(p => p.status === 'completed').length}\n\n${projects.length > 0 ? `📊 **Project Progress:**\n${projects.map(p => `• ${p.name}: ${p.progress}%`).join('\n')}` : ''}\n\n💡 Focus on at-risk projects to prevent delays.`;
  }

  if (q.includes('optim') || q.includes('توزيع') || q.includes('workload')) {
    if (lang === 'ar') {
      return `⚡ **اقتراحات تحسين توزيع العمل:**\n\n${overloaded.length > 0
        ? `🔴 يحتاج هؤلاء المهندسون لتخفيف العبء:\n${overloaded.map(e => `• ${e.nameAr || e.name}: ${e.utilization}%`).join('\n')}`
        : '✅ توزيع العمل متوازن حالياً'}\n\n💡 **توصيات عامة:**\n• راجع المهام اليومية لكل مهندس\n• تأكد من عدم تداخل المشاريع\n• خصص وقتاً للطوارئ (15% من الطاقة)`;
    }
    return `⚡ **Workload Optimization Suggestions:**\n\n${overloaded.length > 0
      ? `🔴 These engineers need load relief:\n${overloaded.map(e => `• ${e.name}: ${e.utilization}%`).join('\n')}`
      : '✅ Workload is balanced currently'}\n\n💡 **General Tips:**\n• Review daily tasks per engineer\n• Ensure no project overlap\n• Reserve 15% capacity for emergencies`;
  }

  // Default
  if (lang === 'ar') {
    return `👋 مرحباً! أنا مساعدك الذكي لإدارة المشاريع الهندسية.\n\nلدي معلومات عن **${projects.length} مشروع** و **${engineers.length} مهندس**.\n\nيمكنني مساعدتك في:\n• 📊 تحليل جداول المشاريع\n• 👥 رصد أعباء المهندسين\n• ⚠️ توقع التأخيرات\n• 📋 إنشاء التقارير\n• 💡 اقتراح تحسينات\n\nاكتب سؤالك أو استخدم الأزرار السريعة أدناه.`;
  }
  return `👋 Hello! I'm your AI assistant for engineering project management.\n\nI have data on **${projects.length} project(s)** and **${engineers.length} engineer(s)**.\n\nI can help with:\n• 📊 Schedule analysis\n• 👥 Engineer workload monitoring\n• ⚠️ Delay prediction\n• 📋 Report generation\n• 💡 Optimization suggestions\n\nType your question or use the quick buttons below.`;
}

const AIAssistant: React.FC = () => {
  const { language } = useApp();
  const { projects, engineers } = useData();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = (text?: string) => {
    const content = (text || input).trim();
    if (!content || loading) return;
    const userMsg: Message = { id: `u${Date.now()}`, role: 'user', content, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setTimeout(() => {
      const reply = generateResponse(content, language, projects, engineers);
      setMessages(prev => [...prev, { id: `a${Date.now()}`, role: 'assistant', content: reply, timestamp: new Date() }]);
      setLoading(false);
    }, 600);
  };

  const formatTime = (d: Date) => d.toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' });

  const renderContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="font-bold text-gray-900 dark:text-white mt-2">{line.slice(2,-2)}</p>;
      }
      const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return <p key={i} className={`${line.startsWith('•') ? 'ms-2' : ''} leading-relaxed`} dangerouslySetInnerHTML={{ __html: formatted }}/>;
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
          <Bot size={20} className="text-white"/>
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{language === 'ar' ? 'المساعد الذكي' : 'AI Assistant'}</h1>
          <p className="text-xs text-gray-500">{language === 'ar' ? 'مساعد إدارة المشاريع الهندسية' : 'Engineering Project Management Assistant'}</p>
        </div>
        <div className="ms-auto flex items-center gap-1.5">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"/>
          <span className="text-xs text-gray-500">{language === 'ar' ? 'متصل' : 'Online'}</span>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pe-1">
        {messages.length === 0 && (
          <div className="card text-center py-10">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles size={28} className="text-blue-600"/>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              {language === 'ar' ? 'مرحباً! كيف يمكنني مساعدتك؟' : 'Hello! How can I help you?'}
            </h3>
            <p className="text-xs text-gray-500 mb-5">
              {language === 'ar' ? 'اسألني عن مشاريعك أو مهندسيك' : 'Ask me about your projects or engineers'}
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {quickPrompts.map((p, i) => (
                <button key={i} onClick={() => sendMessage(language === 'ar' ? p.label.ar : p.label.en)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors border border-blue-200 dark:border-blue-800">
                  {p.icon}{language === 'ar' ? p.label.ar : p.label.en}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <Bot size={13} className="text-white"/>
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-ee-sm'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-es-sm shadow-sm border border-gray-100 dark:border-gray-700'
            }`}>
              {msg.role === 'assistant' ? (
                <div className="space-y-0.5 text-xs leading-relaxed">{renderContent(msg.content)}</div>
              ) : (
                <p>{msg.content}</p>
              )}
              <p className={`text-[10px] mt-1.5 ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>{formatTime(msg.timestamp)}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Bot size={13} className="text-white"/>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-es-sm px-4 py-3 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex gap-1.5">
                {[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}
              </div>
            </div>
          </div>
        )}
        <div ref={endRef}/>
      </div>

      {/* Quick prompts (after messages) */}
      {messages.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
          {quickPrompts.map((p, i) => (
            <button key={i} onClick={() => sendMessage(language === 'ar' ? p.label.ar : p.label.en)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex-shrink-0">
              {p.icon}{language === 'ar' ? p.label.ar : p.label.en}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder={language === 'ar' ? 'اكتب سؤالك هنا...' : 'Type your question here...'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          disabled={loading}
        />
        <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
          className="btn-primary px-4 disabled:opacity-50 disabled:cursor-not-allowed">
          <Send size={16}/>
        </button>
      </div>
    </div>
  );
};

export default AIAssistant;
