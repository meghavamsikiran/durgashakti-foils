import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Clock, CheckCircle2, AlertCircle, 
  ChevronDown, ChevronUp, Image as ImageIcon, Send,
  FileText, CornerDownRight, Search, Copy, Check, Paperclip, X, Play
} from 'lucide-react';
import contactService from '../../../services/contact.service';
import apiClient from '../../../services/core/apiClient';
import PageLoader from '../../../components/ui/PageLoader';
import { Button } from '../../../components/ui/button';
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
  const { ticketId } = useParams();
  const [expandedTicketId, setExpandedTicketId] = useState(ticketId || null);
  const [copiedTicketId, setCopiedTicketId] = useState(null);

  // States for Customer Response composer inside open tickets
  const [replyTexts, setReplyTexts] = useState({});
  const [replyUrls, setReplyUrls] = useState({});
  const [uploadingReplyFiles, setUploadingReplyFiles] = useState({});

  useEffect(() => {
    if (ticketId && tickets.length > 0) {
      const found = tickets.find(t => t.id === ticketId || t.ticket_id === ticketId);
      if (found) {
        setExpandedTicketId(found.id);
      }
    }
  }, [ticketId, tickets]);

  useEffect(() => {
    fetchTickets(false);
    
    // Auto-poll support tickets every 12 seconds in background to reflect admin replies/closings immediately
    const pollInterval = setInterval(() => {
      fetchTickets(false);
    }, 12000);
    
    return () => clearInterval(pollInterval);
  }, []);

  const fetchTickets = async (showSpinner = true) => {
    try {
      if (showSpinner) {
        setLoading(true);
      }
      // Stale-While-Revalidate refresh
      apiClient.invalidateCache('/contacts/my');
      const res = await contactService.getMyTickets();
      setTickets(res.items || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load your support tickets");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (e, text) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedTicketId(text);
    toast.success("Copied Ticket ID to clipboard");
    setTimeout(() => setCopiedTicketId(null), 1500);
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

  const handleReplyFileChange = async (ticketId, e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentUrls = replyUrls[ticketId] || [];
    const imageCount = currentUrls.filter(url => !url.toLowerCase().endsWith('.mp4') && !url.toLowerCase().endsWith('.mov')).length;
    const videoCount = currentUrls.filter(url => url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.mov')).length;

    for (const file of files) {
      const ct = file.type.toLowerCase();
      const isVideo = ct.includes('video') || file.name.toLowerCase().endsWith('.mp4') || file.name.toLowerCase().endsWith('.mov');

      if (isVideo) {
        if (videoCount >= 1) {
          toast.error("You can upload a maximum of 1 video.");
          return;
        }
        if (file.size > 15 * 1024 * 1024) {
          toast.error("Video file size must be less than 15MB.");
          return;
        }
      } else if (ct.startsWith('image/')) {
        if (imageCount >= 3) {
          toast.error("You can upload a maximum of 3 images.");
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error("Image file size must be less than 5MB.");
          return;
        }
      } else {
        toast.error("Only image (PNG, JPG, JPEG, WEBP) or video files are supported.");
        return;
      }

      try {
        setUploadingReplyFiles(prev => ({ ...prev, [ticketId]: true }));
        const res = await contactService.uploadAttachment(file);
        setReplyUrls(prev => ({
          ...prev,
          [ticketId]: [...(prev[ticketId] || []), res.url]
        }));
        toast.success(`Uploaded ${file.name} successfully`);
      } catch (err) {
        console.error(err);
        toast.error(`Failed to upload ${file.name}: ${err.message || 'Error'}`);
      } finally {
        setUploadingReplyFiles(prev => ({ ...prev, [ticketId]: false }));
      }
    }
  };

  const removeReplyFile = (ticketId, indexToRemove) => {
    setReplyUrls(prev => ({
      ...prev,
      [ticketId]: (prev[ticketId] || []).filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleCustomerReplySubmit = async (ticketId) => {
    const text = replyTexts[ticketId] || '';
    if (!text.trim()) {
      toast.error("Please enter a message");
      return;
    }
    try {
      await apiClient.post(`/contacts/${ticketId}/reply`, {
        reply_message: text,
        attachment_urls: replyUrls[ticketId] || []
      });
      toast.success("Reply sent successfully");
      
      // Reset composer states
      setReplyTexts(prev => ({ ...prev, [ticketId]: '' }));
      setReplyUrls(prev => ({ ...prev, [ticketId]: [] }));
      
      // Invalidate caches
      apiClient.invalidateCache('/contacts/my');
      apiClient.invalidateCache('/admin/contacts');
      
      // Refresh list
      await fetchTickets(false);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Failed to send reply");
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
    const blocks = replyMessage.split(/\n\n(?=\[(?:Admin|Customer) -)/);
    return blocks.map(block => {
      if (block.startsWith('[Admin -') || block.startsWith('[Customer -')) {
        const lines = block.split('\n');
        const header = lines[0];
        const rawContent = lines.slice(1).join('\n');

        let sender = 'DS Support Team';
        let timestamp = header.replace(/^\[|\]$/g, '');
        if (timestamp.startsWith('Customer - ')) {
          sender = 'You';
          timestamp = timestamp.replace('Customer - ', '');
        } else if (timestamp.startsWith('Admin - ')) {
          sender = 'DS Support Team';
          timestamp = timestamp.replace('Admin - ', '');
        }

        const { cleanMessage, attachments } = parseMessageAndAttachments(rawContent);
        return { sender, timestamp, content: cleanMessage, attachments };
      } else {
        const { cleanMessage, attachments } = parseMessageAndAttachments(block);
        return { sender: 'DS Support Team', timestamp: null, content: cleanMessage, attachments };
      }
    });
  };

  const getStatusBadge = (status, replyMessage) => {
    const s = (status || '').toLowerCase();
    if (s === 'resolved' || s === 'closed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Resolved
        </span>
      );
    }
    if (s === 'replied') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
          <MessageSquare className="w-3.5 h-3.5" />
          Replied
        </span>
      );
    }
    if (s === 'reopened' || s === 're-opened') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20">
          <Clock className="w-3.5 h-3.5" />
          Re-opened
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-450 border border-amber-500/20">
        <Clock className="w-3.5 h-3.5" />
        Open
      </span>
    );
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

  // If ticketId parameter is present in the URL, render the specific ticket's details directly!
  if (ticketId) {
    const ticket = tickets.find(t => t.id === ticketId || t.ticket_id === ticketId);
    if (!ticket) {
      return (
        <div className="text-center py-20 bg-white dark:bg-[#131B17] rounded-3xl border border-slate-200 dark:border-[#26322B] shadow-sm">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <p className="text-lg font-bold text-slate-800 dark:text-white">Ticket not found</p>
          <a href="/dashboard/tickets" className="text-primary hover:underline text-sm font-semibold mt-2 inline-block">Back to Support Tickets</a>
        </div>
      );
    }

    const { cleanMessage, attachments } = parseMessageAndAttachments(ticket.message);
    const dateFormatted = new Date(ticket.created_at).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const isOpen = ticket.status !== 'resolved' && ticket.status !== 'closed';

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="space-y-6 text-slate-800 dark:text-foreground"
      >
        <div className="flex items-center gap-3">
          <a href="/dashboard/tickets" className="text-slate-500 hover:text-slate-900 dark:hover:text-white text-sm font-bold flex items-center gap-1 select-none">
            &larr; Back to Tickets
          </a>
        </div>

        <div className="bg-white dark:bg-[#131B17] border border-slate-200 dark:border-[#26322B] rounded-3xl p-6 md:p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-[#26322B] pb-6 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-xl font-bold text-primary dark:text-[#25D958] tracking-wider bg-primary/5 dark:bg-[#25D958]/10 px-3 py-1.5 rounded-xl">
                  {ticket.ticket_id}
                </span>
                {getStatusBadge(ticket.status, ticket.reply_message)}
              </div>
              <span className="text-xs text-slate-500 font-mono">
                Opened on {dateFormatted}
              </span>
            </div>
          </div>

          <div className="space-y-6">
            {/* Original Message */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Your Inquiry</h4>
              <div className="bg-slate-50 dark:bg-[#19231F] rounded-2xl p-5 border border-slate-200/60 dark:border-[#26322B]/45">
                <p className="text-sm text-slate-700 dark:text-slate-350 leading-relaxed whitespace-pre-wrap font-medium">{cleanMessage}</p>
              </div>
            </div>

            {/* Attachments */}
            {attachments.length > 0 && (
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2.5">Attached Files</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {attachments.map((url, imgIdx) => (
                    <a 
                      key={imgIdx} 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="group relative aspect-square bg-[#050807] rounded-2xl overflow-hidden border border-slate-200 dark:border-[#26322B]"
                    >
                      <img src={url} alt="Attachment" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Support Conversation Thread */}
            {ticket.reply_message && (
              <div className="border-t border-slate-200/60 dark:border-[#26322B]/60 pt-6 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5 font-sans">
                  <CornerDownRight className="w-3.5 h-3.5 text-primary dark:text-[#25D958]" />
                  Support Conversation Thread
                </h4>
                <div className="space-y-3.5">
                  {parseReplies(ticket.reply_message).map((reply, idx) => {
                    const isSelf = reply.sender === 'You';
                    return (
                      <div 
                        key={idx} 
                        className={`p-5 rounded-2xl border space-y-2.5 shadow-sm max-w-[85%] ${
                          isSelf 
                            ? 'bg-slate-100/60 dark:bg-white/5 border-slate-250 dark:border-white/10 ml-auto' 
                            : 'bg-emerald-500/5 dark:bg-[#25D958]/5 border-emerald-500/10 dark:border-[#25D958]/20 mr-auto'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4 border-b border-slate-200/50 dark:border-white/10 pb-2">
                          <span className={`text-[10px] font-black uppercase tracking-wider ${isSelf ? 'text-slate-500 dark:text-slate-400' : 'text-primary dark:text-[#25D958]'}`}>
                            {reply.sender}
                          </span>
                          {reply.timestamp && (
                            <span className="text-[9px] font-mono text-slate-450 dark:text-slate-500">{reply.timestamp}</span>
                          )}
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-350 leading-relaxed whitespace-pre-wrap font-medium">
                          {reply.content}
                        </p>
                        
                        {reply.attachments && reply.attachments.length > 0 && (
                          <div className="grid grid-cols-3 gap-1.5 pt-2">
                            {reply.attachments.map((url, imgIdx) => {
                              const isVid = url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.mov');
                              return (
                                <a 
                                  key={imgIdx} 
                                  href={url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="relative aspect-square bg-[#050807] rounded-lg border border-slate-200 dark:border-[#26322B] overflow-hidden flex items-center justify-center"
                                >
                                  {isVid ? (
                                    <div className="w-full h-full flex items-center justify-center bg-black">
                                      <Play className="w-5 h-5 text-white" />
                                    </div>
                                  ) : (
                                    <img src={url} alt="Attachment" className="w-full h-full object-cover" />
                                  )}
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Customer Reply Composer */}
            {isOpen ? (
              <div className="border-t border-slate-200/60 dark:border-[#26322B]/60 pt-6 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <CornerDownRight className="w-3.5 h-3.5 text-primary" />
                  Write Response
                </h4>
                <div className="space-y-3">
                  <textarea
                    value={replyTexts[ticket.id] || ''}
                    onChange={(e) => setReplyTexts(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                    placeholder="Type your response to Durga Shakti support..."
                    className="w-full min-h-[100px] rounded-xl border border-slate-250 dark:border-[#26322B] bg-white dark:bg-[#1E2722] p-4 text-sm focus:border-primary focus:ring-0 transition-all outline-none text-slate-800 dark:text-white font-medium"
                  />

                  {replyUrls[ticket.id] && replyUrls[ticket.id].length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {replyUrls[ticket.id].map((url, imgIdx) => {
                        const isVid = url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.mov');
                        return (
                          <div key={imgIdx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-[#26322B] bg-white dark:bg-[#19231F]/30 group">
                            {isVid ? (
                              <div className="w-full h-full flex items-center justify-center bg-black">
                                <Play className="w-6 h-6 text-white" />
                              </div>
                            ) : (
                              <img src={url} alt="Uploaded attachment" className="w-full h-full object-cover" />
                            )}
                            <button
                              type="button"
                              onClick={() => removeReplyFile(ticket.id, imgIdx)}
                              className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-rose-600 rounded-lg text-white transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <label className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#1E2722] dark:hover:bg-[#26322B] text-slate-650 dark:text-slate-350 rounded-xl cursor-pointer text-xs font-bold transition-colors select-none border border-slate-200 dark:border-[#26322B]">
                      <Paperclip className="w-4 h-4 text-primary" />
                      <span>{uploadingReplyFiles[ticket.id] ? 'Uploading...' : 'Attach Files (Max 3 img, 1 vid)'}</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/*"
                        onChange={(e) => handleReplyFileChange(ticket.id, e)}
                        disabled={uploadingReplyFiles[ticket.id]}
                        className="hidden"
                      />
                    </label>

                    <Button
                      onClick={() => handleCustomerReplySubmit(ticket.id)}
                      disabled={uploadingReplyFiles[ticket.id] || !(replyTexts[ticket.id] || '').trim()}
                      className="h-10 px-6 bg-primary hover:bg-[#1bb847] text-white font-bold uppercase tracking-wider rounded-xl text-xs"
                    >
                      Send Message
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-t border-slate-200/60 dark:border-[#26322B]/60 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-100/40 dark:bg-emerald-950/5 p-4 rounded-xl border border-slate-200 dark:border-emerald-500/10">
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">This ticket is closed</p>
                    <p className="text-xs">If your issue is not resolved, you can re-open it at any time to resume discussion.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleReopen(ticket.id)}
                  className="px-5 py-2.5 bg-[#25D958] hover:bg-[#1bb847] text-[#0C1310] font-black uppercase tracking-wider rounded-xl text-xs transition-all shadow-sm active:scale-95 duration-200 shrink-0 font-sans"
                >
                  Re-Open Ticket
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      className="space-y-6 text-slate-800 dark:text-foreground"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Support Tickets</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Track and manage your cases with Durga Shakti Foils support.</p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-[#131B17] border border-slate-200 dark:border-[#26322B] rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#25D958]/30 transition-all"
          />
        </div>
      </div>

      {/* Patience Note Banner */}
      <div className="bg-amber-500/5 dark:bg-[#25D958]/5 border border-amber-500/10 dark:border-[#25D958]/20 rounded-2xl p-4 text-xs text-amber-650 dark:text-slate-350 font-semibold flex items-center gap-2">
        <AlertCircle className="w-4 h-4 shrink-0 text-amber-500 dark:text-[#25D958]" />
        <span>Please be patient. It takes a maximum of 2-3 business days to get a response from our support team.</span>
      </div>

      {filteredTickets.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 dark:bg-[#131B17] rounded-2xl border border-dashed border-slate-200 dark:border-[#26322B]">
          <MessageSquare className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 font-bold">No tickets found</p>
          <p className="text-xs text-slate-400 dark:text-slate-555 mt-1 font-medium">Submit a contact form query to raise a new support ticket.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map(ticket => {
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
                className="bg-white dark:bg-[#131B17] border border-slate-200 dark:border-[#26322B] rounded-2xl overflow-hidden hover:border-[#25D958]/30 transition-all duration-300 shadow-sm dark:shadow-none"
              >
                {/* View Details Header Row */}
                <div 
                  onClick={() => window.open(`/dashboard/tickets/${ticket.id}`, '_blank')}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-primary dark:text-[#25D958] tracking-wider bg-primary/5 dark:bg-[#25D958]/10 px-2.5 py-1 rounded-lg">
                        <a 
                          href={`/dashboard/tickets/${ticket.id}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          onClick={(e) => e.stopPropagation()} 
                          className="hover:underline"
                        >
                          {ticket.ticket_id}
                        </a>
                        <button
                          type="button"
                          onClick={(e) => handleCopy(e, ticket.ticket_id)}
                          className="hover:text-primary transition-colors p-0.5 rounded focus:outline-none flex items-center justify-center"
                          title="Copy Ticket ID"
                        >
                          {copiedTicketId === ticket.ticket_id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 opacity-60 hover:opacity-100 text-primary dark:text-[#25D958]" />
                          )}
                        </button>
                      </div>
                      {getStatusBadge(ticket.status, ticket.reply_message)}
                      <span className="text-xs text-slate-500 font-mono">
                        {dateFormatted}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-350 truncate">
                      {cleanMessage}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                    {attachments.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 dark:bg-[#19231F] px-2.5 py-1 rounded-md">
                        <ImageIcon className="w-3.5 h-3.5" />
                        {attachments.length} {attachments.length === 1 ? 'file' : 'files'}
                      </span>
                    )}
                    <a 
                      href={`/dashboard/tickets/${ticket.id}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      onClick={(e) => e.stopPropagation()}
                      className="bg-slate-100 hover:bg-[#25D958] hover:text-[#0C1310] dark:bg-[#1E2722] dark:hover:bg-[#25D958] dark:hover:text-[#0C1310] dark:text-slate-355 text-slate-750 font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-sm inline-block select-none font-sans"
                    >
                      View Details
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default TicketsTab;
