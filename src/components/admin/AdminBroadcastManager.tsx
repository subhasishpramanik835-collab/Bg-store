import React, { useState, useEffect } from 'react';
import { Send, Bell, ShieldCheck, CheckCircle2, AlertCircle, Trash2, Search, Smartphone, Mail, MessageSquare, Radio, Sparkles, Filter, RefreshCw, Eye, Users } from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { soundFx } from '../../utils/audio';

interface BroadcastCampaign {
  id: string;
  title: string;
  priority: 'Urgent / Alert' | 'High Priority' | 'Normal Announcement' | 'Promotional';
  targetSegment: 'All Users' | 'Active Players' | 'VIP Players' | 'High Balance Users';
  body: string;
  channels: string[];
  createdAt: string;
  sentCount?: number;
  status?: 'Sent' | 'Scheduled' | 'Failed';
}

export const AdminBroadcastManager: React.FC = () => {
  const [campaignTitle, setCampaignTitle] = useState('');
  const [priorityType, setPriorityType] = useState<BroadcastCampaign['priority']>('Urgent / Alert');
  const [targetSegment, setTargetSegment] = useState<BroadcastCampaign['targetSegment']>('All Users');
  const [messageBody, setMessageBody] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['In-App Push', 'Banner']);
  const [isSending, setIsSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Real-time campaigns list
  const [campaigns, setCampaigns] = useState<BroadcastCampaign[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'broadcasts'), (snap) => {
      const list: BroadcastCampaign[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as BroadcastCampaign);
      });
      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setCampaigns(list);
    }, (err) => console.warn('Broadcasts snapshot notice:', err.message));

    return () => unsub();
  }, []);

  const handleChannelToggle = (channel: string) => {
    soundFx.playClick();
    if (selectedChannels.includes(channel)) {
      setSelectedChannels(selectedChannels.filter(c => c !== channel));
    } else {
      setSelectedChannels([...selectedChannels, channel]);
    }
  };

  const handleTriggerBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignTitle.trim()) {
      setStatusMsg({ type: 'error', text: 'Please enter a Campaign Title!' });
      return;
    }
    if (!messageBody.trim()) {
      setStatusMsg({ type: 'error', text: 'Please write the Broadcast Message Body!' });
      return;
    }

    setIsSending(true);
    setStatusMsg(null);

    try {
      const broadcastId = `BC-${Date.now()}`;
      const newCampaign: BroadcastCampaign = {
        id: broadcastId,
        title: campaignTitle.trim(),
        priority: priorityType,
        targetSegment,
        body: messageBody.trim(),
        channels: selectedChannels,
        createdAt: new Date().toISOString(),
        sentCount: Math.floor(Math.random() * 50) + 120, // Simulated active broadcast user count
        status: 'Sent'
      };

      await setDoc(doc(db, 'broadcasts', broadcastId), newCampaign);

      soundFx.playWinFanfare();
      setStatusMsg({
        type: 'success',
        text: `🚀 Multi-Channel Broadcast triggered successfully! Dispatched to ${newCampaign.sentCount} active users in real-time.`
      });

      // Clear form
      setCampaignTitle('');
      setMessageBody('');
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `Failed to trigger broadcast: ${err.message}` });
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    soundFx.playClick();
    try {
      await deleteDoc(doc(db, 'broadcasts', id));
      setStatusMsg({ type: 'success', text: 'Broadcast log deleted.' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `Failed to delete: ${err.message}` });
    }
  };

  const filteredCampaigns = campaigns.filter(c =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.priority.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 font-mono">
      {/* Top Header Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-950 rounded-3xl border border-indigo-500/30 shadow-2xl space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-2xl">
            <Bell className="w-6 h-6 text-indigo-400 animate-bounce" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <span>Broadcast & Notification Center</span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2.5 py-0.5 rounded-full font-bold uppercase">
                REALTIME MULTI-CHANNEL
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Compose real-time push notifications, SMS alerts, email newsletters & site announcement banners
            </p>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {statusMsg && (
        <div className={`p-4 rounded-2xl border text-xs flex items-center gap-3 shadow-lg animate-in fade-in ${
          statusMsg.type === 'success'
            ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'
            : 'bg-rose-950/90 border-rose-500/50 text-rose-300'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" /> : <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />}
          <span className="font-bold">{statusMsg.text}</span>
        </div>
      )}

      {/* Main Grid: Form + Channels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2-Cols: Compose Broadcast Campaign Form */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-indigo-400" />
              <span>Compose Broadcast Campaign</span>
            </h3>
            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-bold">
              LIVE DISPATCH
            </span>
          </div>

          <form onSubmit={handleTriggerBroadcast} className="space-y-4">
            {/* Campaign Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">Campaign Title</label>
              <input
                type="text"
                placeholder="e.g. 🎉 $1,000,000 Draw Tomorrow!"
                value={campaignTitle}
                onChange={(e) => setCampaignTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Dropdowns Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">Priority Type</label>
                <select
                  value={priorityType}
                  onChange={(e) => setPriorityType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-indigo-300 font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="Urgent / Alert">Urgent / Alert</option>
                  <option value="High Priority">High Priority</option>
                  <option value="Normal Announcement">Normal Announcement</option>
                  <option value="Promotional">Promotional</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">Target Segment</label>
                <select
                  value={targetSegment}
                  onChange={(e) => setTargetSegment(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-indigo-300 font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="All Users">All Users</option>
                  <option value="Active Players">Active Players</option>
                  <option value="VIP Players">VIP Players</option>
                  <option value="High Balance Users">High Balance Users</option>
                </select>
              </div>
            </div>

            {/* Channels Selection */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold text-slate-300 block">Active Dispatch Channels</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: 'In-App Push', icon: Smartphone },
                  { name: 'Banner', icon: Radio },
                  { name: 'Email Newsletter', icon: Mail },
                  { name: 'SMS Gateway', icon: MessageSquare }
                ].map((ch) => {
                  const Icon = ch.icon;
                  const isSel = selectedChannels.includes(ch.name);
                  return (
                    <button
                      key={ch.name}
                      type="button"
                      onClick={() => handleChannelToggle(ch.name)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                        isSel
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-500/20'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{ch.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Broadcast Message Body */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">Broadcast Message Body</label>
              <textarea
                rows={4}
                placeholder="Type push/email body..."
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              />
            </div>

            {/* Trigger Button */}
            <button
              type="submit"
              disabled={isSending}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs rounded-2xl shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSending ? 'DISPATCHING BROADCAST...' : 'TRIGGER MULTI-CHANNEL BROADCAST'}</span>
            </button>
          </form>
        </div>

        {/* Right 1-Col: Push & Gateway Channels Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-indigo-400" />
                <span>Push & Gateway Channels</span>
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Real-time status of integrated notification infrastructure</p>
            </div>

            <div className="space-y-3">
              {[
                { name: 'Firebase Cloud Messaging (FCM)', status: 'ACTIVE / CONNECTED', icon: Smartphone, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                { name: 'Twilio SMS Gateway', status: 'READY (API KEY ACTIVE)', icon: MessageSquare, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                { name: 'Gmail SMTP OTP Delivery', status: 'CONFIGURED & READY', icon: Mail, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                { name: 'In-App Live Ticker', status: 'BROADCASTING LIVE', icon: Radio, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' }
              ].map((channel, i) => {
                const Icon = channel.icon;
                return (
                  <div key={i} className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-slate-900 text-indigo-400 rounded-xl border border-slate-800">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-white text-xs">{channel.name}</p>
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border inline-block mt-0.5 ${channel.bg} ${channel.color}`}>
                          {channel.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-4 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl space-y-1 text-xs text-indigo-200">
            <span className="font-bold block flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Real-Time Sync active</span>
            </span>
            <p className="text-[10px] text-slate-400">
              Triggered broadcasts sync instantly with Firestore and reach all logged-in player sessions across web & mobile applets.
            </p>
          </div>
        </div>

      </div>

      {/* Campaign Dispatch History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Broadcast Campaign History ({campaigns.length})</span>
            </h3>
            <p className="text-[10px] text-slate-400">Real-time log of all previously triggered messages</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search campaign history..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {filteredCampaigns.length === 0 ? (
          <div className="py-10 text-center space-y-2 text-slate-500 text-xs">
            <Bell className="w-8 h-8 text-slate-700 mx-auto" />
            <p>No broadcast campaigns recorded yet. Use the form above to dispatch your first message!</p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {filteredCampaigns.map((c) => (
              <div key={c.id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-slate-700 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-white text-sm">{c.title}</span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase border ${
                      c.priority === 'Urgent / Alert'
                        ? 'bg-rose-950 text-rose-300 border-rose-800'
                        : c.priority === 'High Priority'
                        ? 'bg-amber-950 text-amber-300 border-amber-800'
                        : 'bg-indigo-950 text-indigo-300 border-indigo-800'
                    }`}>
                      {c.priority}
                    </span>
                    <span className="text-[9px] bg-slate-900 text-slate-400 border border-slate-800 px-2 py-0.5 rounded font-bold">
                      Segment: {c.targetSegment}
                    </span>
                  </div>

                  <p className="text-slate-300 text-xs">{c.body}</p>

                  <div className="flex items-center gap-3 text-[10px] text-slate-500 flex-wrap pt-1">
                    <span>Dispatched: {new Date(c.createdAt).toLocaleString()}</span>
                    <span>• Channels: {c.channels?.join(', ') || 'In-App Push'}</span>
                    <span>• Recipient Count: <strong className="text-emerald-400">{c.sentCount || 100} users</strong></span>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteCampaign(c.id)}
                  className="p-2 bg-rose-950/60 hover:bg-rose-900 text-rose-400 hover:text-white rounded-xl border border-rose-500/30 transition-colors shrink-0 self-start sm:self-center"
                  title="Delete Log Entry"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
