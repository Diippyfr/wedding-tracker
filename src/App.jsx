import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, UserPlus, CheckCircle, HelpCircle, XCircle, Trash2, Search,
  Loader2, MapPin, Edit2, Save, X, ExternalLink, Calculator, ListTodo, Wallet
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';

// --- FIREBASE CONFIGURATION ---
// ⚠️ PASTE YOUR REAL FIREBASE KEYS HERE BEFORE SAVING! ⚠️
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "AIzaSyAP8FxxZYriZVtCtaKHc9t029FMwx9zPm8",
  authDomain: "wedding-list-29bec.firebaseapp.com",
  projectId: "wedding-list-29bec",
  storageBucket: "wedding-list-29bec.firebasestorage.app",
  messagingSenderId: "290653372044",
  appId: "1:290653372044:web:eddda14b3bce72515c05a9"
    };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const appId = typeof __app_id !== 'undefined' ? __app_id : 'allen-wedding';
const GUESTS_COLLECTION = typeof __firebase_config !== 'undefined' 
  ? `artifacts/${appId}/public/data/guests` : 'guests';
const PLANNING_COLLECTION = typeof __firebase_config !== 'undefined' 
  ? `artifacts/${appId}/public/data/planning` : 'planning';

const CATEGORIES = ['Immediate Family', 'Extended Family', 'Friends', 'Other'];
const RSVP_STATUSES = ['Pending', 'Attending', 'Declined'];

// NEW: Planning Categories
const PLANNING_CATEGORIES = [
  'Venue & Site Prep',
  'Structural Rentals',
  'Power & Logistics',
  'Guest Comfort',
  'Tables & Seating',
  'Tabletop & Decor',
  'Catering & Bar',
  'Attire & Beauty',
  'Ceremony Essentials',
  'Photography & Videography',
  'Entertainment',
  'Floral & Design',
  'Stationery',
  'Cleanup & Waste Management'
];

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  
  // App Navigation
  const [activeTab, setActiveTab] = useState('guests'); // 'guests' or 'planning'

  // --- Guest List State ---
  const [guests, setGuests] = useState([]);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState(CATEGORIES[0]);
  const [newPlusOne, setNewPlusOne] = useState(false);
  const [newAddress, setNewAddress] = useState(''); 
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', address: '', category: CATEGORIES[0] });

  // --- Planning State ---
  const [planItems, setPlanItems] = useState([]);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanCost, setNewPlanCost] = useState('');
  const [newPlanLink, setNewPlanLink] = useState('');
  const [newPlanCategory, setNewPlanCategory] = useState(PLANNING_CATEGORIES[0]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Authentication error:", error);
        setErrorMessage(error.message);
        setLoading(false);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Sync Guests
  useEffect(() => {
    if (!user) return; 
    const guestsRef = collection(db, GUESTS_COLLECTION);
    const unsubscribe = onSnapshot(guestsRef, (snapshot) => {
      const guestData = [];
      snapshot.forEach((doc) => guestData.push({ id: doc.id, ...doc.data() }));
      guestData.sort((a, b) => a.createdAt - b.createdAt);
      setGuests(guestData);
      setLoading(false);
      setErrorMessage(null);
    }, (error) => {
      console.error("Error fetching guests:", error);
      setErrorMessage(error.message);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // Sync Planning Items
  useEffect(() => {
    if (!user) return; 
    const planRef = collection(db, PLANNING_COLLECTION);
    const unsubscribe = onSnapshot(planRef, (snapshot) => {
      const planData = [];
      snapshot.forEach((doc) => planData.push({ id: doc.id, ...doc.data() }));
      planData.sort((a, b) => a.createdAt - b.createdAt);
      setPlanItems(planData);
    }, (error) => {
      console.error("Error fetching planning items:", error);
    });
    return () => unsubscribe();
  }, [user]);


  // --- Guest Database Actions ---
  const handleAddGuest = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !user) return;
    try {
      await addDoc(collection(db, GUESTS_COLLECTION), {
        name: newName.trim(),
        category: newCategory,
        plusOne: newPlusOne,
        address: newAddress.trim(),
        saveTheDateSent: false,
        inviteSent: false,
        rsvpStatus: 'Pending',
        createdAt: Date.now()
      });
      setNewName('');
      setNewPlusOne(false);
      setNewAddress('');
    } catch (error) {
      console.error("Error adding guest:", error);
    }
  };

  const handleDeleteGuest = async (id) => {
    try { await deleteDoc(doc(db, GUESTS_COLLECTION, id)); } 
    catch (error) { console.error("Error deleting guest:", error); }
  };

  const handleTogglePlusOne = async (id, currentStatus) => {
    try { await updateDoc(doc(db, GUESTS_COLLECTION, id), { plusOne: !currentStatus }); } 
    catch (error) { console.error("Error updating plus one:", error); }
  };

  const handleUpdateRSVP = async (id, status) => {
    try { await updateDoc(doc(db, GUESTS_COLLECTION, id), { rsvpStatus: status }); } 
    catch (error) { console.error("Error updating RSVP:", error); }
  };

  const handleToggleMail = async (id, field, currentValue) => {
    try { await updateDoc(doc(db, GUESTS_COLLECTION, id), { [field]: !currentValue }); } 
    catch (error) { console.error(`Error updating ${field}:`, error); }
  };

  const startEditing = (guest) => {
    setEditingId(guest.id);
    setEditForm({ name: guest.name, address: guest.address || '', category: guest.category });
  };

  const saveEdit = async (id) => {
    if (!editForm.name.trim()) return;
    try {
      await updateDoc(doc(db, GUESTS_COLLECTION, id), {
        name: editForm.name.trim(), address: editForm.address.trim(), category: editForm.category
      });
      setEditingId(null);
    } catch (error) { console.error("Error saving edit:", error); }
  };

  // --- Planning Database Actions ---
  const handleAddPlanItem = async (e) => {
    e.preventDefault();
    if (!newPlanName.trim() || !user) return;
    try {
      await addDoc(collection(db, PLANNING_COLLECTION), {
        name: newPlanName.trim(),
        cost: parseFloat(newPlanCost) || 0,
        link: newPlanLink.trim(),
        category: newPlanCategory,
        createdAt: Date.now()
      });
      setNewPlanName('');
      setNewPlanCost('');
      setNewPlanLink('');
    } catch (error) {
      console.error("Error adding planning item:", error);
    }
  };

  const handleDeletePlanItem = async (id) => {
    try { await deleteDoc(doc(db, PLANNING_COLLECTION, id)); } 
    catch (error) { console.error("Error deleting plan item:", error); }
  };


  // --- Derived Data ---
  const guestStats = useMemo(() => {
    let totalInvited = 0, totalAttending = 0, totalDeclined = 0, totalPending = 0;
    guests.forEach(g => {
      const headcount = g.plusOne ? 2 : 1;
      totalInvited += headcount;
      if (g.rsvpStatus === 'Attending') totalAttending += headcount;
      else if (g.rsvpStatus === 'Declined') totalDeclined += headcount;
      else totalPending += headcount;
    });
    return { totalInvited, totalAttending, totalDeclined, totalPending };
  }, [guests]);

  const filteredGuests = guests.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));
  
  const groupedGuests = useMemo(() => {
    const grouped = {};
    CATEGORIES.forEach(cat => grouped[cat] = []);
    filteredGuests.forEach(g => {
      if (grouped[g.category]) grouped[g.category].push(g);
      else grouped['Other'].push(g);
    });
    return grouped;
  }, [filteredGuests]);

  const totalBudget = useMemo(() => {
    return planItems.reduce((acc, item) => acc + (item.cost || 0), 0);
  }, [planItems]);

  const groupedPlanItems = useMemo(() => {
    const grouped = {};
    PLANNING_CATEGORIES.forEach(cat => grouped[cat] = []);
    planItems.forEach(item => {
      if (grouped[item.category]) grouped[item.category].push(item);
    });
    return grouped;
  }, [planItems]);

  // --- Renderers ---

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex flex-col items-center justify-center text-stone-500">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-rose-400" />
        <p>Loading your data...</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex flex-col items-center justify-center text-stone-500 p-8 text-center">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-rose-200 max-w-md">
          <XCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-serif text-stone-800 mb-2">Connection Error</h2>
          <p className="text-rose-600 font-mono text-sm mb-4">{errorMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] text-stone-800 font-sans pb-12">
      
      {/* Header & Tabs */}
      <header className="bg-white shadow-sm border-b border-stone-200 pt-12 pb-0 text-center">
        <h1 className="text-4xl md:text-5xl font-serif text-stone-900 mb-2 px-4">Allen Wedding</h1>
        <p className="text-stone-500 max-w-lg mx-auto mb-8 px-4">
          Manage your invitations, plus ones, RSVPs, and budget in one place.
        </p>
        
        {/* Tab Navigation */}
        <div className="flex justify-center border-t border-stone-100 bg-stone-50/50">
          <button 
            onClick={() => setActiveTab('guests')}
            className={`flex items-center gap-2 px-8 py-4 font-medium text-sm transition-colors border-b-2 ${activeTab === 'guests' ? 'border-stone-800 text-stone-900 bg-white' : 'border-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-50'}`}
          >
            <Users size={18} /> Guest List
          </button>
          <button 
            onClick={() => setActiveTab('planning')}
            className={`flex items-center gap-2 px-8 py-4 font-medium text-sm transition-colors border-b-2 ${activeTab === 'planning' ? 'border-stone-800 text-stone-900 bg-white' : 'border-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-50'}`}
          >
            <Calculator size={18} /> Budget & Planner
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 mt-8 space-y-8">
        
        {/* ========================================= */}
        {/* GUEST LIST TAB              */}
        {/* ========================================= */}
        {activeTab === 'guests' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Statistics Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-100 flex flex-col items-center justify-center text-center">
                <Users className="text-stone-400 mb-2" size={24} />
                <p className="text-sm text-stone-500 font-medium">Total Invited</p>
                <p className="text-3xl font-serif text-stone-800">{guestStats.totalInvited}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-100 flex flex-col items-center justify-center text-center">
                <CheckCircle className="text-emerald-500 mb-2" size={24} />
                <p className="text-sm text-stone-500 font-medium">Attending</p>
                <p className="text-3xl font-serif text-emerald-600">{guestStats.totalAttending}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-100 flex flex-col items-center justify-center text-center">
                <HelpCircle className="text-amber-500 mb-2" size={24} />
                <p className="text-sm text-stone-500 font-medium">Pending</p>
                <p className="text-3xl font-serif text-amber-600">{guestStats.totalPending}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-100 flex flex-col items-center justify-center text-center">
                <XCircle className="text-rose-400 mb-2" size={24} />
                <p className="text-sm text-stone-500 font-medium">Declined</p>
                <p className="text-3xl font-serif text-rose-500">{guestStats.totalDeclined}</p>
              </div>
            </div>

            {/* Add Guest Form */}
            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-stone-100">
              <h2 className="text-xl font-serif mb-4 flex items-center gap-2">
                <UserPlus size={20} className="text-stone-400" />
                Add New Guest
              </h2>
              <form onSubmit={handleAddGuest} className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-sm font-medium text-stone-500 mb-1">Guest Name</label>
                    <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g., Jane Doe" className="w-full px-4 py-3 md:py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400" required />
                  </div>
                  <div className="w-full md:w-48">
                    <label className="block text-sm font-medium text-stone-500 mb-1">Category</label>
                    <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full px-4 py-3 md:py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400">
                      {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className="w-full md:w-auto flex items-center h-[48px] md:h-[42px] px-2">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input type="checkbox" checked={newPlusOne} onChange={(e) => setNewPlusOne(e.target.checked)} className="w-6 h-6 md:w-5 md:h-5 rounded text-rose-500 border-stone-300 focus:ring-rose-400 accent-rose-400" />
                      <span className="text-base md:text-sm font-medium text-stone-600">Has Plus One?</span>
                    </label>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-sm font-medium text-stone-500 mb-1">Mailing Address (Optional)</label>
                    <input type="text" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} placeholder="123 Wedding Lane, Nashville, TN 37201" className="w-full px-4 py-3 md:py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400" />
                  </div>
                  <button type="submit" disabled={!user} className="w-full md:w-auto px-8 py-3 md:py-2 h-[48px] md:h-[42px] bg-stone-800 hover:bg-stone-900 disabled:bg-stone-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm">
                    Add to List
                  </button>
                </div>
              </form>
            </div>

            {/* Guest Lists Rendering */}
            <div className="space-y-8">
              {CATEGORIES.map(category => {
                const categoryGuests = groupedGuests[category];
                if (categoryGuests.length === 0) return null;

                return (
                  <div key={category} className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
                    <div className="bg-stone-50 px-6 py-4 border-b border-stone-100 flex justify-between items-center">
                      <h3 className="text-lg font-serif text-stone-800">{category}</h3>
                      <span className="text-xs font-medium bg-stone-200 text-stone-600 px-2 py-1 rounded-full">
                        {categoryGuests.length} {categoryGuests.length === 1 ? 'Party' : 'Parties'}
                      </span>
                    </div>
                    
                    <div className="divide-y divide-stone-100">
                      {categoryGuests.map(guest => (
                        <div key={guest.id} className="p-4 sm:p-6 hover:bg-stone-50/50 transition-colors">
                          {editingId === guest.id ? (
                            <div className="flex flex-col gap-3 bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
                              <div className="flex flex-col md:flex-row gap-3">
                                <div className="flex-1">
                                  <label className="block text-xs font-medium text-stone-500 mb-1">Name</label>
                                  <input value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-200" />
                                </div>
                                <div className="flex-1">
                                  <label className="block text-xs font-medium text-stone-500 mb-1">Address</label>
                                  <input value={editForm.address} onChange={(e) => setEditForm({...editForm, address: e.target.value})} className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-200" placeholder="Address..." />
                                </div>
                                <div className="w-full md:w-48">
                                  <label className="block text-xs font-medium text-stone-500 mb-1">Category</label>
                                  <select value={editForm.category} onChange={(e) => setEditForm({...editForm, category: e.target.value})} className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-200">
                                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                  </select>
                                </div>
                              </div>
                              <div className="flex justify-end gap-2 mt-2">
                                <button onClick={() => setEditingId(null)} className="px-4 py-2 text-sm font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors flex items-center gap-1"><X size={16}/> Cancel</button>
                                <button onClick={() => saveEdit(guest.id)} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1"><Save size={16}/> Save</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                              <div className="flex-1 w-full lg:w-auto">
                                <div className="flex items-center gap-3 flex-wrap">
                                  <p className="font-medium text-stone-900 text-lg break-words">{guest.name}</p>
                                  {guest.plusOne && (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-rose-50 text-rose-600 px-2 py-1 rounded-md border border-rose-100 whitespace-nowrap">
                                      <UserPlus size={12} /> +1 Included
                                    </span>
                                  )}
                                </div>
                                {guest.address && (
                                  <div className="flex items-start gap-1.5 mt-1.5 text-stone-500">
                                    <MapPin size={14} className="mt-0.5 shrink-0 text-stone-400" />
                                    <p className="text-sm whitespace-pre-wrap leading-tight">{guest.address}</p>
                                  </div>
                                )}
                                <div className="flex items-center gap-6 mt-3 pt-3 border-t border-stone-100 lg:border-none lg:pt-0 lg:mt-2">
                                  <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer hover:text-stone-900 transition-colors">
                                    <input type="checkbox" checked={guest.saveTheDateSent || false} onChange={() => handleToggleMail(guest.id, 'saveTheDateSent', guest.saveTheDateSent)} className="w-4 h-4 rounded text-rose-500 border-stone-300 focus:ring-rose-400 accent-rose-400"/>
                                    Save the Date Sent
                                  </label>
                                  <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer hover:text-stone-900 transition-colors">
                                    <input type="checkbox" checked={guest.inviteSent || false} onChange={() => handleToggleMail(guest.id, 'inviteSent', guest.inviteSent)} className="w-4 h-4 rounded text-emerald-500 border-stone-300 focus:ring-emerald-400 accent-emerald-500"/>
                                    Invite Sent
                                  </label>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center justify-between lg:justify-end w-full lg:w-auto gap-3 mt-2 lg:mt-0">
                                <label className="flex items-center gap-2 cursor-pointer bg-white border border-stone-200 px-3 py-1.5 rounded-lg hover:bg-stone-50 transition-colors flex-1 lg:flex-none justify-center">
                                  <input type="checkbox" checked={guest.plusOne} onChange={() => handleTogglePlusOne(guest.id, guest.plusOne)} className="w-4 h-4 rounded text-rose-500 border-stone-300 accent-rose-400"/>
                                  <span className="text-sm text-stone-600 font-medium">Plus One</span>
                                </label>
                                <div className="relative flex-1 lg:flex-none">
                                  <select value={guest.rsvpStatus} onChange={(e) => handleUpdateRSVP(guest.id, e.target.value)} className={`w-full appearance-none pr-8 pl-3 py-1.5 rounded-lg text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors ${guest.rsvpStatus === 'Attending' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : guest.rsvpStatus === 'Declined' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                    {RSVP_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                                  </select>
                                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-current opacity-50">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 lg:border-l lg:border-stone-200 lg:pl-3">
                                  <button onClick={() => startEditing(guest)} className="text-stone-400 hover:text-emerald-600 p-2 hover:bg-emerald-50 rounded-lg transition-colors flex-shrink-0"><Edit2 size={18} /></button>
                                  <button onClick={() => handleDeleteGuest(guest.id)} className="text-stone-400 hover:text-rose-500 p-2 hover:bg-rose-50 rounded-lg transition-colors flex-shrink-0"><Trash2 size={18} /></button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================= */}
        {/* BUDGET & PLANNING TAB            */}
        {/* ========================================= */}
        {activeTab === 'planning' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            {/* Planner Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-stone-900 p-6 rounded-2xl shadow-sm border border-stone-800 flex flex-col items-center justify-center text-center text-white">
                <Wallet className="text-stone-400 mb-2" size={32} />
                <p className="text-stone-400 font-medium">Total Estimated Cost</p>
                <p className="text-4xl md:text-5xl font-serif mt-1">
                  ${totalBudget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 flex flex-col items-center justify-center text-center">
                <ListTodo className="text-stone-300 mb-2" size={32} />
                <p className="text-stone-500 font-medium">Items Planned</p>
                <p className="text-4xl md:text-5xl font-serif text-stone-800 mt-1">{planItems.length}</p>
              </div>
            </div>

            {/* Add Planning Item Form */}
            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-stone-100">
              <h2 className="text-xl font-serif mb-4 flex items-center gap-2">
                <Calculator size={20} className="text-stone-400" />
                Add Budget Item
              </h2>
              <form onSubmit={handleAddPlanItem} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  
                  <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-stone-500 mb-1">Item / Vendor Name</label>
                    <input type="text" value={newPlanName} onChange={(e) => setNewPlanName(e.target.value)} placeholder="e.g., DJ Smooth" className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400" required />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-stone-500 mb-1">Cost ($)</label>
                    <input type="number" step="0.01" min="0" value={newPlanCost} onChange={(e) => setNewPlanCost(e.target.value)} placeholder="0.00" className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400" />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-stone-500 mb-1">Link (Optional)</label>
                    <input type="url" value={newPlanLink} onChange={(e) => setNewPlanLink(e.target.value)} placeholder="https://..." className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400" />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-stone-500 mb-1">Category</label>
                    <select value={newPlanCategory} onChange={(e) => setNewPlanCategory(e.target.value)} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400">
                      {PLANNING_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>

                </div>
                <div className="flex justify-end mt-2">
                  <button type="submit" disabled={!user} className="w-full md:w-auto px-8 py-2 bg-stone-800 hover:bg-stone-900 text-white font-medium rounded-lg transition-colors flex items-center justify-center shadow-sm">
                    Add to Planner
                  </button>
                </div>
              </form>
            </div>

            {/* Render Planning Categories */}
            <div className="space-y-6">
              {PLANNING_CATEGORIES.map(category => {
                const items = groupedPlanItems[category];
                if (items.length === 0) return null;

                const categoryTotal = items.reduce((sum, item) => sum + (item.cost || 0), 0);

                return (
                  <div key={category} className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
                    <div className="bg-stone-50 px-6 py-4 border-b border-stone-100 flex justify-between items-center">
                      <h3 className="text-lg font-serif text-stone-800">{category}</h3>
                      <span className="text-sm font-bold text-stone-700">
                        ${categoryTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    
                    <div className="divide-y divide-stone-100">
                      {items.map(item => (
                        <div key={item.id} className="p-4 sm:px-6 hover:bg-stone-50/50 transition-colors">
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="flex-1 w-full lg:w-auto">
                              <p className="font-medium text-stone-900">{item.name}</p>
                              {item.link && (
                                <a href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1 text-sm text-blue-600 hover:text-blue-800 hover:underline">
                                  <ExternalLink size={14} /> View Resource
                                </a>
                              )}
                              <div className="flex items-center gap-6 mt-3 pt-3 border-t border-stone-100 lg:border-none lg:pt-0 lg:mt-2">
                                <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer hover:text-stone-900 transition-colors">
                                  <input type="checkbox" checked={item.contacted || false} onChange={() => handleTogglePlanStatus(item.id, 'contacted', item.contacted)} className="w-4 h-4 rounded text-amber-500 border-stone-300 focus:ring-amber-400 accent-amber-500"/>
                                  Contacted
                                </label>
                                <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer hover:text-stone-900 transition-colors">
                                  <input type="checkbox" checked={item.booked || false} onChange={() => handleTogglePlanStatus(item.id, 'booked', item.booked)} className="w-4 h-4 rounded text-emerald-500 border-stone-300 focus:ring-emerald-400 accent-emerald-500"/>
                                  Booked/Confirmed
                                </label>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between lg:justify-end gap-6 w-full lg:w-auto mt-2 lg:mt-0">
                              <p className="font-mono font-medium text-stone-700">
                                ${(item.cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                              <button onClick={() => handleDeletePlanItem(item.id)} className="text-stone-400 hover:text-rose-500 p-2 hover:bg-rose-50 rounded-lg transition-colors" title="Remove item">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

      </main>
    </div>
  );
}