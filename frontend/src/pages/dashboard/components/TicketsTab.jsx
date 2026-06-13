import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Clock, CheckCircle2, AlertCircle, 
  ChevronDown, ChevronUp, Image as ImageIcon, Send,
  FileText, CornerDownRight, Search
} from 'lucide-react';
import contactService from '../../../services/contact.service';
import apiClient from '../../../services/core/apiClient';
import PageLoader from '../../../components/ui/PageLoader';
import { toast } from 'sonner';

const TicketsTab = () => {
  const [tickets, setTickets] = useState(() => {
    const cached = apiClient.getCachedDataSync('/contacts/my');
    return cached?.data?.items || [];
  });
  const [loading, setLoading] = useState(() => {
    const cached = apiClient.getCachedDataSync('/contacts/my');
    return !cached;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTicketId, setExpandedTicketId] = useState(null);

  useEffect(() => {
    fetchTickets(false);
  }, []);

  const fetchTickets = async (showSpinner = true) => {
    try {
      if (showSpinner) {
        setLoading(true);
      }
      const res = await contactService.getMyTickets();
      setTickets(res.items || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load your support tickets");
    } finally {
      setLoading(false);
    }
  };

  const handleReopen = async (ticketId) => {
    try {
      await apiClient.post(`/contacts/${ticketId}/reopen`);
      toast.success("Ticket re-opened successfully");
      
      // Invalidate both cache routes immediately so user & admin see updates
      apiClient.invalidateCache('/contacts/my');
      apiClient.invalidateCache('/admin/contacts');
      
      // Refresh list in background
      await fetchTickets(false);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Failed to re-open ticket");
    }
  };

  const parseMessageAndAttachments = (message) => {
    if (!message) return { cleanMessage: '', attachments: [] };
    const parts = message.split('\n\n[Attachments]\n');
    if (parts.length > 1) {
      const cleanMessage = parts[0];
      const attachments = parts[1].split('\n').filter(url => url.trim().length > 0);
      return { cleanMessage, attachments };
    }
    return { cleanMessage: message, attachments: [] };
  };

  const parseReplies = (replyMessage) => {
    if (!replyMessage) return [];
    if (!replyMessage.startsWith('[')) {
      return [{ timestamp: null, content: replyMessage }];
    }
    const parts = replyMessage.split(/\n\n(?=\[)/);
    return parts.map(part => {
      const lines = part.split('\n');
      const header = lines[0];
      const content = lines.slice(1).join('\n');
      const timestamp = header.replace(/^\[|\]$/g, '');
      return { timestamp, content };
    });
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'resolved':
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Resolved
          </span>
        );
      case 'replied':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <MessageSquare className="w-3.5 h-3.5" />
            Replied
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            Open
          </span>
        );
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const q = searchQuery.toLowerCase();
    return (
      ticket.ticket_id.toLowerCase().includes(q) ||
      ticket.message.toLowerCase().includes(q) ||
      (ticket.reply_message && ticket.reply_message.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return <PageLoader message="Loading your support tickets..." />;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      className="space-y-6 text-foreground"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Support Tickets</h2>
          <p className="text-sm text-slate-400 mt-1">Track and manage your cases with Durga Shakti Foils support.</p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#131B17] border border-[#26322B] rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#25D958]/30 transition-all"
          />
        </div>
      </div>

      {filteredTickets.length === 0 ? (
        <div className="text-center py-20 bg-[#131B17] rounded-2xl border border-dashed border-[#26322B]">
          <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 font-bold">No tickets found</p>
          <p className="text-xs text-slate-500 mt-1">Submit a contact form query to raise a new support ticket.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map(ticket => {
            const isExpanded = expandedTicketId === ticket.id;
            const { cleanMessage, attachments } = parseMessageAndAttachments(ticket.message);
            const dateFormatted = new Date(ticket.created_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div 
                key={ticket.id} 
                className="bg-[#131B17] border border-[#26322B] rounded-2xl overflow-hidden hover:border-[#25D958]/30 transition-all duration-300"
              >
                {/* Accordion Header */}
                <div 
                  onClick={() => setExpandedTicketId(isExpanded ? null : ticket.id)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <span className="font-mono text-sm font-bold text-[#25D958] tracking-wider bg-[#25D958]/10 px-2.5 py-1 rounded-lg">
                        {ticket.ticket_id}
                      </span>
                      {getStatusBadge(ticket.status)}
                      <span className="text-xs text-slate-500 font-mono">
                        {dateFormatted}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-350 truncate">
                      {cleanMessage}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                    {attachments.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-slate-500 bg-[#19231F] px-2 py-1 rounded-md">
                        <ImageIcon className="w-3.5 h-3.5" />
                        {attachments.length} {attachments.length === 1 ? 'file' : 'files'}
                      </span>
                    )}
                    <button className="p-1 text-slate-400 hover:text-white transition-colors">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Accordion Body */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden border-t border-[#26322B]/60"
                    >
                      <div className="p-6 bg-[#19231F]/30 space-y-6">
                        {/* Original Message */}
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Your Inquiry</h4>
                          <div className="bg-[#131B17]/60 rounded-xl p-4 border border-[#26322B]/40">
                            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{cleanMessage}</p>
                          </div>
                        </div>

                        {/* Attachments */}
                        {attachments.length > 0 && (
                          <div>
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2.5">Attached Files</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                              {attachments.map((url, index) => (
                                <a 
                                  key={index} 
                                  href={url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="group relative aspect-square bg-[#131B17] rounded-xl border border-[#26322B] overflow-hidden hover:border-[#25D958]/40 transition-all"
                                >
                                  <img 
                                    src={url} 
                                    alt={`Attachment ${index + 1}`} 
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  />
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-white bg-[#25D958] px-2 py-1 rounded-md">View Original</span>
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Replies */}
                        {ticket.reply_message ? (
                          <div className="border-t border-[#26322B]/60 pt-6 space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5">
                              <CornerDownRight className="w-3.5 h-3.5 text-[#25D958]" />
                              Support Reply History
                            </h4>
                            <div className="space-y-3">
                              {parseReplies(ticket.reply_message).map((reply, idx) => (
                                <div key={idx} className="bg-[#25D958]/5 border border-[#25D958]/20 rounded-xl p-5 space-y-2">
                                  <div className="flex items-center justify-between gap-2 border-b border-[#25D958]/10 pb-2.5">
                                    <span className="text-xs font-bold text-[#25D958] uppercase tracking-wider">DS Support Team</span>
                                    {reply.timestamp ? (
                                      <span className="text-[10px] font-mono text-slate-500">{reply.timestamp}</span>
                                    ) : (
                                      ticket.replied_at && (
                                        <span className="text-[10px] font-mono text-slate-500">
                                          {new Date(ticket.replied_at).toLocaleDateString(undefined, {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </span>
                                      )
                                    )}
                                  </div>
                                  <p className="text-sm text-slate-350 leading-relaxed whitespace-pre-wrap">
                                    {reply.content}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="border-t border-[#26322B]/60 pt-6">
                            <div className="flex items-center gap-3 text-slate-500 bg-[#131B17]/30 border border-[#26322B]/30 rounded-xl p-4">
                              <Clock className="w-5 h-5 shrink-0 text-amber-500/80" />
                              <div className="text-xs">
                                <span className="font-semibold text-slate-400 block mb-0.5">Awaiting agent response</span>
                                Our customer success team will review your ticket and reply shortly. You will receive an email confirmation.
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Customer Re-Open Action */}
                        {(ticket.status === 'resolved' || ticket.status === 'closed') && (
                          <div className="border-t border-[#26322B]/60 pt-6 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleReopen(ticket.id)}
                              className="px-5 py-2.5 bg-[#25D958] hover:bg-[#1bb847] text-[#0C1310] font-black uppercase tracking-wider rounded-xl text-xs transition-all shadow-sm active:scale-95 duration-200"
                            >
                              Re-Open Case
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default TicketsTab;
