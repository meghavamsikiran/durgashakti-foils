import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, User, Calendar, X, Home, MapPin, 
  CreditCard, Heart, Bell, Settings, LogOut, 
  ChevronRight, Plus, Trash2, CheckCircle2, ShieldCheck,
  AlertCircle, ArrowLeft, ShoppingBag, Clock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import TablePagination from '../components/ui/TablePagination';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { Loader2, CreditCard as CardIcon, Shield, Lock, CreditCard as CreditCardIcon, Plus as PlusIcon } from 'lucide-react';

const RAZORPAY_KEY_ID = process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_test_SlmLztmM54CPAn';

const Dashboard = () => {
  const { user, logout, loading: authLoading, refreshUser } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('orders');
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [cards, setCards] = useState([]);
  const [notifications, setNotifications] = useState([]);
  
  // Form States
  const [profileForm, setProfileForm] = useState({ full_name: '', email: '', phone: '' });
  const [addressForm, setAddressForm] = useState({ label: 'Home', full_name: '', phone: '', address_line1: '', address_line2: '', city: '', state: '', pincode: '', is_default: false });
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [returnOrderId, setReturnOrderId] = useState(null);
  const [returnReason, setReturnReason] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [ordersPage, setOrdersPage] = useState(1);
  const ORDERS_PER_PAGE = 5;
  const [checkingPincode, setCheckingPincode] = useState(false);
  const [cardForm, setCardForm] = useState({ number: '', name: '', expiry: '', cvv: '' });
  const [showCardModal, setShowCardModal] = useState(false);
  
  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [oRes, wRes, aRes, cRes, nRes] = await Promise.all([
        api.getOrders(),
        api.getWishlist(),
        api.getAddresses(),
        api.getSavedCards(),
        api.getNotifications()
      ]);
      setOrders(oRes.data || []);
      setWishlist(wRes.data || []);
      setAddresses(aRes.data || []);
      setCards(cRes.data || []);
      setNotifications(nRes.data || []);
      setProfileForm({ full_name: user.full_name, email: user.email, phone: user.phone || '' });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user && !localStorage.getItem('token')) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [user, authLoading, fetchData, navigate]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await api.updateProfile(profileForm);
      await refreshUser();
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (addressForm.pincode.length !== 6) {
      toast.error("Please enter a valid 6-digit pincode");
      return;
    }
    try {
      await api.addAddress(addressForm);
      toast.success('Address saved successfully');
      setShowAddressForm(false);
      const res = await api.getAddresses();
      setAddresses(res.data);
    } catch (err) { toast.error('Failed to save address'); }
  };

  const handlePincodeChange = async (e) => {
    const pin = e.target.value.replace(/\D/g, '').slice(0, 6);
    setAddressForm(prev => ({ ...prev, pincode: pin }));

    if (pin.length === 6) {
      setCheckingPincode(true);
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await res.json();
        if (data[0].Status === "Success") {
          const postOffice = data[0].PostOffice[0];
          setAddressForm(prev => ({
            ...prev,
            state: postOffice.State,
            city: postOffice.District || postOffice.Block
          }));
          toast.success(`Location detected: ${postOffice.District}, ${postOffice.State}`);
        } else {
          toast.error("Invalid Pincode");
        }
      } catch (err) {
        console.error("Pincode API failed:", err);
      } finally {
        setCheckingPincode(false);
      }
    }
  };

  const handleDeleteAddress = async (id) => {
    try {
      await api.deleteAddress(id);
      setAddresses(addresses.filter(a => a.id !== id));
      toast.success('Address removed');
    } catch (err) { toast.error('Failed to remove'); }
  };

  const handleToggleWishlist = async (productId) => {
    try {
      await api.toggleWishlist(productId);
      const res = await api.getWishlist();
      setWishlist(res.data);
      toast.success('Wishlist updated');
    } catch (err) { toast.error('Action failed'); }
  };

  const handleSaveCard = async (e) => {
    e.preventDefault();
    try {
      const last4 = cardForm.number.slice(-4);
      const brand = cardForm.number.startsWith('4') ? 'Visa' : cardForm.number.startsWith('5') ? 'Mastercard' : 'Credit Card';
      const [month, year] = cardForm.expiry.split('/');
      
      await api.saveCard({
        holder_name: cardForm.name,
        last4,
        brand,
        expiry_month: month,
        expiry_year: '20' + year
      });
      
      toast.success('Card saved securely');
      setShowCardModal(false);
      setCardForm({ number: '', name: '', expiry: '', cvv: '' });
      const res = await api.getSavedCards();
      setCards(res.data);
    } catch (err) { toast.error('Failed to save card'); }
  };
  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Cancel this order?')) return;
    try {
      await api.cancelOrder(orderId);
      toast.success('Order cancelled');
      const res = await api.getOrders();
      setOrders(res.data);
    } catch (err) { toast.error('Failed to cancel'); }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { id: 'orders', label: 'My Orders', icon: Package },
    { id: 'transactions', label: 'Payments', icon: CreditCard },
    { id: 'cards', label: 'Saved Cards', icon: ShieldCheck },
    { id: 'wishlist', label: 'Wishlist', icon: Heart },
    { id: 'addresses', label: 'Addresses', icon: MapPin },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: notifications.filter(n => !n.is_read).length },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
    "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", 
    "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
  ];

  if (authLoading || (loading && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 font-bold animate-pulse">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 py-12 px-6 lg:px-24">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar */}
        <aside className="w-full lg:w-80 flex-shrink-0">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden sticky top-8">
            <div className="p-8 bg-slate-900 text-white relative overflow-hidden">
               <div className="relative z-10">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-xl flex items-center justify-center mb-4">
                     <User className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-xl font-black truncate">{user?.full_name}</h2>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{user?.email}</p>
               </div>
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
            </div>
            
            <nav className="p-4">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all mb-1 ${activeTab === item.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm font-bold">{item.label}</span>
                  </div>
                  {item.badge > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{item.badge}</span>
                  )}
                </button>
              ))}
              
              <hr className="my-4 border-slate-100" />
              
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 p-4 rounded-2xl text-rose-500 hover:bg-rose-50 transition-all"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-bold">Sign Out</span>
              </button>
            </nav>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-8 lg:p-12 min-h-[600px]">
            <AnimatePresence mode="wait">
              {activeTab === 'orders' && (
                <motion.div key="orders" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">My Orders</h2>
                    <ShoppingBag className="w-8 h-8 text-slate-100" />
                  </div>
                  
                  {orders.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                      <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500 font-bold">No orders found yet</p>
                      <Button onClick={() => navigate('/shop')} className="mt-6 rounded-xl">Start Shopping</Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.slice((ordersPage - 1) * ORDERS_PER_PAGE, ordersPage * ORDERS_PER_PAGE).map((order) => (
                        <div key={order.id} className="p-6 rounded-3xl border border-slate-100 hover:border-indigo-100 transition-all bg-white shadow-sm hover:shadow-md">
                          <div className="flex flex-col md:flex-row gap-6">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Order #{order.order_number}</span>
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${order.payment_status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                  {order.payment_status}
                                </span>
                              </div>
                              <h3 className="text-lg font-black text-slate-900 mb-1">
                                {order.items.map(item => item.product_name).join(', ')}
                              </h3>
                              <p className="text-sm text-slate-500 font-medium">Placed on {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-black text-slate-900 mb-4">₹{order.total_amount.toLocaleString()}</div>
                              <div className="flex items-center justify-end gap-2">
                                {['pending', 'processing'].includes(order.order_status) && (
                                  <Button variant="ghost" onClick={() => handleCancelOrder(order.id)} className="text-rose-500 hover:bg-rose-50 rounded-xl text-xs font-bold px-4">Cancel</Button>
                                )}
                                <Button onClick={() => setSelectedOrder(order)} className="rounded-xl px-6 font-bold shadow-indigo-100 shadow-lg">View Details</Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {orders.length > ORDERS_PER_PAGE && (
                    <TablePagination
                      currentPage={ordersPage}
                      totalPages={Math.ceil(orders.length / ORDERS_PER_PAGE)}
                      onPageChange={setOrdersPage}
                      totalItems={orders.length}
                      pageSize={ORDERS_PER_PAGE}
                    />
                  )}
                </motion.div>
              )}

              {activeTab === 'wishlist' && (
                <motion.div key="wishlist" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                   <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Wishlist</h2>
                   {wishlist.length === 0 ? (
                      <div className="text-center py-20 bg-slate-50 rounded-3xl">
                        <Heart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 font-bold">Your wishlist is empty</p>
                      </div>
                   ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {wishlist.map(product => (
                          <div key={product.id} className="group p-4 rounded-3xl border border-slate-100 bg-white hover:shadow-lg transition-all relative">
                             <img src={product.image_url} alt="" className="w-full h-40 object-cover rounded-2xl mb-4" />
                             <h4 className="font-black text-slate-900 truncate">{product.name}</h4>
                             <p className="text-xl font-black text-indigo-600 mt-1">₹{product.price}</p>
                             <div className="flex gap-2 mt-4">
                                <Button onClick={() => addToCart(product)} className="flex-1 rounded-xl">Add to Cart</Button>
                                <Button variant="ghost" onClick={() => handleToggleWishlist(product.id)} className="rounded-xl text-rose-500 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></Button>
                             </div>
                          </div>
                        ))}
                     </div>
                   )}
                </motion.div>
              )}

              {activeTab === 'addresses' && (
                <motion.div key="addresses" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                   <div className="flex items-center justify-between">
                      <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Addresses</h2>
                      {!showAddressForm && (
                        <Button onClick={() => setShowAddressForm(true)} className="rounded-2xl h-14 px-8 gap-2 shadow-xl shadow-indigo-100 font-black uppercase tracking-widest bg-indigo-600 text-white">
                           <PlusIcon className="w-5 h-5" /> New Address
                        </Button>
                      )}
                   </div>

                   {showAddressForm ? (
                     <form onSubmit={handleAddAddress} className="p-10 rounded-[3rem] bg-white border border-slate-100 shadow-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-3 mb-4">
                           <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
                              <MapPin className="w-5 h-5" />
                           </div>
                           <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Add New Address</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</Label>
                              <Input placeholder="e.g. Rahul Sharma" value={addressForm.full_name} onChange={e => setAddressForm({...addressForm, full_name: e.target.value})} required className="rounded-2xl h-16 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-600 transition-all px-6 text-lg font-bold" />
                           </div>
                           <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Mobile Number</Label>
                              <PhoneInput
                                international
                                defaultCountry="IN"
                                value={addressForm.phone}
                                onChange={val => setAddressForm({...addressForm, phone: val || ''})}
                                displayInitialValueAsLocalNumber={false}
                                className="flex h-16 w-full rounded-2xl border border-transparent bg-slate-50 px-6 py-2 text-lg font-bold ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-within:bg-white focus-within:border-indigo-600 transition-all outline-none"
                              />
                           </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                           <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Pincode</Label>
                              <div className="relative">
                                 <Input placeholder="6 digits" value={addressForm.pincode} onChange={handlePincodeChange} required maxLength={6} className="rounded-2xl h-16 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-600 transition-all px-6 text-lg font-bold" />
                                 {checkingPincode && <Loader2 className="absolute right-6 top-5 w-6 h-6 animate-spin text-indigo-600" />}
                              </div>
                           </div>
                           <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">State</Label>
                              <select 
                                 value={addressForm.state} 
                                 onChange={e => setAddressForm({...addressForm, state: e.target.value})}
                                 className="w-full rounded-2xl h-16 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-600 transition-all px-6 text-lg font-bold outline-none appearance-none cursor-pointer"
                              >
                                 <option value="">Select State</option>
                                 {INDIAN_STATES.map(state => (
                                    <option key={state} value={state}>{state}</option>
                                 ))}
                              </select>
                           </div>
                           <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">City / District</Label>
                              <Input 
                                 value={addressForm.city} 
                                 onChange={e => setAddressForm({...addressForm, city: e.target.value})}
                                 placeholder="Enter City" 
                                 className="rounded-2xl h-16 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-600 transition-all px-6 text-lg font-bold" 
                              />
                           </div>
                        </div>

                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Flat, House no., Building, Apartment</Label>
                           <Input value={addressForm.address_line1} onChange={e => setAddressForm({...addressForm, address_line1: e.target.value})} required className="rounded-2xl h-16 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-600 transition-all px-6 text-lg font-bold" />
                        </div>

                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Area, Street, Landmark (Optional)</Label>
                           <Input value={addressForm.address_line2} onChange={e => setAddressForm({...addressForm, address_line2: e.target.value})} className="rounded-2xl h-16 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-600 transition-all px-6 text-lg font-bold" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8">
                           <Button type="submit" className="h-16 rounded-[1.5rem] text-lg font-black uppercase tracking-widest shadow-2xl shadow-indigo-200">Save Address</Button>
                           <Button type="button" variant="ghost" onClick={() => setShowAddressForm(false)} className="h-16 rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-slate-50">Cancel</Button>
                        </div>
                     </form>
                   ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {addresses.length === 0 ? (
                           <div className="md:col-span-2 p-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                 <MapPin className="w-10 h-10 text-slate-300" />
                              </div>
                              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">No addresses found</h3>
                              <p className="text-slate-500 font-medium mt-2">Add your shipping address to start ordering.</p>
                           </div>
                        ) : addresses.map(addr => (
                          <div key={addr.id} className="p-8 rounded-[2.5rem] border border-slate-100 bg-white relative group hover:shadow-2xl hover:border-indigo-100 transition-all animate-in zoom-in-95 duration-500">
                             <div className="flex items-center gap-3 mb-6">
                                <div className="px-4 py-1 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest">{addr.label}</div>
                                {addr.is_default && <div className="px-4 py-1 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest">Primary</div>}
                             </div>
                             <h4 className="text-xl font-black text-slate-900 mb-2">{addr.full_name}</h4>
                             <p className="text-slate-500 leading-relaxed font-medium">
                                {addr.address_line1}<br />
                                {addr.address_line2 && <>{addr.address_line2}<br /></>}
                                {addr.city}, {addr.state} - <span className="font-black text-slate-900">{addr.pincode}</span>
                             </p>
                             <div className="mt-6 flex items-center gap-3 pt-6 border-t border-slate-50">
                                <div className="flex items-center gap-2 text-slate-400 font-bold text-sm">
                                   {addr.phone}
                                </div>
                             </div>
                             <button onClick={() => handleDeleteAddress(addr.id)} className="absolute top-8 right-8 w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white">
                                <Trash2 className="w-5 h-5" />
                             </button>
                          </div>
                        ))}
                     </div>
                   )}
                </motion.div>
              )}

              {activeTab === 'notifications' && (
                <motion.div key="notifications" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                   <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Notifications</h2>
                   <div className="space-y-4">
                      {notifications.length === 0 ? (
                        <div className="text-center py-20 bg-slate-50 rounded-3xl">
                           <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                           <p className="text-slate-500 font-bold">No new notifications</p>
                        </div>
                      ) : notifications.map(n => (
                        <div key={n.id} className={`p-6 rounded-3xl border transition-all ${n.is_read ? 'bg-white border-slate-100 opacity-60' : 'bg-indigo-50/30 border-indigo-100'}`}>
                           <div className="flex gap-4">
                              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${n.type === 'order' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                 {n.type === 'order' ? <Package className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                              </div>
                              <div>
                                 <h4 className="font-black text-slate-900">{n.title}</h4>
                                 <p className="text-sm text-slate-600 mt-1">{n.message}</p>
                                 <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">{new Date(n.created_at).toLocaleDateString()}</p>
                              </div>
                           </div>
                        </div>
                      ))}
                   </div>
                </motion.div>
              )}

              {activeTab === 'transactions' && (
                <motion.div key="transactions" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                   <div className="flex items-center justify-between">
                      <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Transaction History</h2>
                   </div>
                   
                   <div className="space-y-4">
                      {orders.filter(o => o.payment_status === 'completed').length === 0 ? (
                        <div className="p-20 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                           <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                           <p className="text-slate-500 font-bold">No payments found</p>
                        </div>
                      ) : (
                        orders.filter(o => o.payment_status === 'completed').map(order => (
                          <div key={order.id} className="p-6 rounded-3xl bg-white border border-slate-100 hover:border-indigo-100 transition-all flex items-center justify-between group">
                             <div className="flex items-center gap-6">
                                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                   <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <div>
                                   <div className="text-sm font-black text-slate-900">Payment for Order #{order.order_number}</div>
                                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                      {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                   </div>
                                </div>
                             </div>
                             <div className="text-right">
                                <div className="text-xl font-black text-slate-900">₹{order.total_amount.toLocaleString()}</div>
                                <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Success</div>
                             </div>
                          </div>
                        ))
                      )}
                   </div>
                </motion.div>
              )}

              {activeTab === 'cards' && (
                <motion.div key="cards" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                   <div className="flex items-center justify-between">
                      <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Saved Cards</h2>
                      <div className="text-slate-400 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                        <Shield className="w-4 h-4" /> Secured by Razorpay
                      </div>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      {cards.length === 0 ? (
                        <div className="md:col-span-2 p-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                           <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                              <ShieldCheck className="w-10 h-10 text-slate-300" />
                           </div>
                           <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">No cards saved yet</h3>
                           <p className="text-slate-500 font-medium mt-2">Securely save your cards for faster checkouts.</p>
                        </div>
                      ) : (
                        cards.map(card => (
                          <div key={card.id} className="p-10 rounded-[3rem] bg-slate-900 text-white relative overflow-hidden group hover:scale-[1.02] transition-all shadow-2xl">
                             <div className="relative z-10">
                                <div className="flex justify-between items-start mb-12">
                                   <div className="px-5 py-2 bg-white/10 backdrop-blur-md rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 shadow-inner">{card.brand}</div>
                                   <div className="w-14 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg shadow-lg relative overflow-hidden">
                                      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_50%,#fff,transparent)]"></div>
                                      <div className="w-full h-[1px] bg-white/30 absolute top-1/2 -translate-y-1/2"></div>
                                      <div className="w-[1px] h-full bg-white/30 absolute left-1/2 -translate-x-1/2"></div>
                                   </div>
                                </div>
                                <div className="text-3xl font-mono tracking-[0.2em] mb-12 drop-shadow-2xl">
                                   <span className="opacity-40">•••• •••• ••••</span> <span className="font-black">{card.last4}</span>
                                </div>
                                <div className="flex justify-between items-end">
                                   <div>
                                      <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Card Holder</div>
                                      <div className="text-lg font-black uppercase tracking-tight">{card.holder_name}</div>
                                   </div>
                                   <div className="text-right">
                                      <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Expires</div>
                                      <div className="text-lg font-black">{card.expiry_month}/{card.expiry_year}</div>
                                   </div>
                                </div>
                             </div>
                             <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/20 rounded-full blur-[120px] -mr-40 -mt-40 group-hover:bg-indigo-500/40 transition-all duration-700"></div>
                             <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-[80px] -ml-24 -mb-24"></div>
                          </div>
                        ))
                      )}
                   </div>
                </motion.div>
              )}

              {activeTab === 'settings' && (
                <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                   <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Profile Settings</h2>
                    <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-xl">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Full Name</label>
                        <Input value={profileForm.full_name} onChange={e => setProfileForm({...profileForm, full_name: e.target.value})} className="rounded-2xl h-14" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Email Address</label>
                        <Input value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} className="rounded-2xl h-14" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Phone Number</label>
                        <Input value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} className="rounded-2xl h-14" />
                      </div>
                      <Button type="submit" className="rounded-2xl h-14 px-12 shadow-xl shadow-indigo-100">Save Changes</Button>
                   </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl border border-slate-100 overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
               <div>
                 <h3 className="text-2xl font-black text-slate-900">Order Details</h3>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">#{selectedOrder.order_number}</p>
               </div>
               <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-white rounded-full transition-colors">
                 <X className="w-6 h-6 text-slate-400" />
               </button>
            </div>
            
            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
               <div className="space-y-4">
                 <h4 className="text-[11px] font-black uppercase tracking-widest text-indigo-600">Items</h4>
                 <div className="divide-y divide-slate-100">
                    {selectedOrder.items.map((item, i) => (
                      <div key={i} className="py-4 flex justify-between items-center">
                        <div>
                          <div className="font-bold text-slate-800">{item.product_name}</div>
                          <div className="text-xs text-slate-400 font-medium">Qty: {item.quantity} × ₹{item.price}</div>
                        </div>
                        <div className="font-black text-slate-900">₹{item.quantity * item.price}</div>
                      </div>
                    ))}
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-8">
                 <div className="space-y-4">
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-indigo-600">Shipping To</h4>
                    <div className="text-sm font-medium text-slate-600 leading-relaxed">
                       <p className="font-black text-slate-900 mb-1">{selectedOrder.shipping_address.full_name}</p>
                       <p>{selectedOrder.shipping_address.address_line1}</p>
                       <p>{selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.state}</p>
                       <p>{selectedOrder.shipping_address.pincode}</p>
                    </div>
                 </div>
                 <div className="space-y-4">
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-indigo-600">Summary</h4>
                    <div className="space-y-2">
                       <div className="flex justify-between text-sm">
                          <span className="text-slate-400 font-medium">Subtotal</span>
                          <span className="text-slate-900 font-bold">₹{selectedOrder.total_amount}</span>
                       </div>
                       <div className="flex justify-between text-sm">
                          <span className="text-slate-400 font-medium">Shipping</span>
                          <span className="text-emerald-500 font-bold uppercase text-[10px] tracking-widest">Free</span>
                       </div>
                       <div className="pt-2 border-t border-slate-100 flex justify-between">
                          <span className="text-slate-900 font-black">Total</span>
                          <span className="text-xl font-black text-slate-900">₹{selectedOrder.total_amount}</span>
                       </div>
                    </div>
                 </div>
               </div>
            </div>
            
            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
               <Button onClick={() => setSelectedOrder(null)} className="rounded-xl px-12 font-black uppercase tracking-widest">Close</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;