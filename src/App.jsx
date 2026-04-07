import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  CheckCircle, 
  HelpCircle, 
  XCircle, 
  Trash2, 
  Search,
  Loader2,
  MapPin,
  Edit2,
  Save,
  X
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';

// --- FIREBASE CONFIGURATION ---
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
  ? `artifacts/${appId}/public/data/guests` 
  : 'guests';

const CATEGORIES = ['Immediate Family', 'Extended Family', 'Friends', 'Other'];
const RSVP_STATUSES = ['Pending', 'Attending', 'Declined'];

export default function App() {
  const [guests, setGuests] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState(CATEGORIES[0]);
  const [newPlusOne, setNewPlusOne] = useState(false);
  const [newAddress, setNewAddress] = useState(''); // <-- NEW STATE FOR ADDRESS
  const [searchQuery, setSearchQuery] = useState('');

  // Edit mode state
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', address: '', category: CATEGORIES[0] });

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

  useEffect(() => {
    if (!user) return; 

    const guestsRef = collection(db, GUESTS_COLLECTION);
    
    const unsubscribe = onSnapshot(guestsRef, (snapshot) => {
      const guestData = [];
      snapshot.forEach((doc) => {
        guestData.push({ id: doc.id, ...doc.data() });
      });
      
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

  // --- Database Actions ---

  const handleAddGuest = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !user) return;

    try {
      await addDoc(collection(db, GUESTS_COLLECTION), {
        name: newName.trim(),
        category: newCategory,
        plusOne: newPlusOne,
        address: newAddress.trim(), // <-- SAVE ADDRESS TO DATABASE
        saveTheDateSent: false,
        inviteSent: false,
        rsvpStatus: 'Pending',
        createdAt: Date.now()
      });
      setNewName('');
      setNewPlusOne(false);
      setNewAddress(''); // <-- RESET ADDRESS BOX
    } catch (error) {
      console.error("Error adding guest:", error);
      alert("Failed to add guest. Check console for details.");
    }
  };

  const handleDeleteGuest = async (id) => {
    try {
      await deleteDoc(doc(db, GUESTS_COLLECTION, id));
    } catch (error) {
      console.error("Error deleting guest:", error);
    }
  };

  const handleTogglePlusOne = async (id, currentStatus) => {
    try {
      await updateDoc(doc(db, GUESTS_COLLECTION, id), {
        plusOne: !currentStatus
      });
    } catch (error) {
      console.error("Error updating plus one:", error);
    }
  };

  const handleUpdateRSVP = async (id, status) => {
    try {
      await updateDoc(doc(db, GUESTS_COLLECTION, id), {
        rsvpStatus: status
      });
    } catch (error) {
      console.error("Error updating RSVP:", error);
    }
  };

  const handleToggleMail = async (id, field, currentValue) => {
    try {
      await updateDoc(doc(db, GUESTS_COLLECTION, id), {
        [field]: !currentValue
      });
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
    }
  };

  const startEditing = (guest) => {
    setEditingId(guest.id);
    setEditForm({ 
      name: guest.name, 
      address: guest.address || '', 
      category: guest.category 
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const saveEdit = async (id) => {
    if (!editForm.name.trim()) return;
    try {
      await updateDoc(doc(db, GUESTS_COLLECTION, id), {
        name: editForm.name.trim(),
        address: editForm.address.trim(),
        category: editForm.category
      });
      setEditingId(null);
    } catch (error) {
      console.error("Error saving edit:", error);
    }
  };

  // --- Derived Data for the UI ---

  const stats = useMemo(() => {
    let totalInvited = 0;
    let totalAttending = 0;
    let totalDeclined = 0;
    let totalPending = 0;

    guests.forEach(g => {
      const headcount = g.plusOne ? 2 : 1;
      totalInvited += headcount;
      
      if (g.rsvpStatus === 'Attending') totalAttending += headcount;
      else if (g.rsvpStatus === 'Declined') totalDeclined += headcount;
      else totalPending += headcount;
    });

    return { totalInvited, totalAttending, totalDeclined, totalPending };
  }, [guests]);

  const filteredGuests = useMemo(() => {
    if (!searchQuery.trim()) return guests;
    const lowerQuery = searchQuery.toLowerCase();
    return guests.filter(g => g.name.toLowerCase().includes(lowerQuery));
  }, [guests, searchQuery]);

  const groupedGuests = useMemo(() => {
    const grouped = {};
    CATEGORIES.forEach(cat => grouped[cat] = []);
    filteredGuests.forEach(g => {
      if (grouped[g.category]) {
        grouped[g.category].push(g);
      } else {
        grouped['Other'].push(g);
      }
    });
    return grouped;
  }, [filteredGuests]);

  // --- Render ---

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex flex-col items-center justify-center text-stone-500">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-rose-400" />
        <p>Loading guest list...</p>
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
          <p className="text-sm text-stone-600">
            Check your Firebase Console to make sure <b>Anonymous Sign-in</b> is enabled and your <b>Firestore Database</b> is created!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] text-stone-800 font-sans pb-12">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-stone-200 pt-12 pb-8 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-serif text-stone-900 mb-2">Allen Wedding</h1>
        <p className="text-stone-500 max-w-lg mx-auto">
          Manage your invitations, plus ones, addresses, and RSVPs in one place.
        </p>
      </header>

      <main className="max-w-5xl mx-auto px-4 mt-8 space-y-8">
        {/* Statistics Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-100 flex flex-col items-center justify-center text-center">
            <Users className="text-stone-400 mb-2" size={24} />
            <p className="text-sm text-stone-500 font-medium">Total Invited</p>
            <p className="text-3xl font-serif text-stone-800">{stats.totalInvited}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-100 flex flex-col items-center justify-center text-center">
            <CheckCircle className="text-emerald-500 mb-2" size={24} />
            <p className="text-sm text-stone-500 font-medium">Attending</p>
            <p className="text-3xl font-serif text-emerald-600">{stats.totalAttending}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-100 flex flex-col items-center justify-center text-center">
            <HelpCircle className="text-amber-500 mb-2" size={24} />
            <p className="text-sm text-stone-500 font-medium">Pending</p>
            <p className="text-3xl font-serif text-amber-600">{stats.totalPending}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-100 flex flex-col items-center justify-center text-center">
            <XCircle className="text-rose-400 mb-2" size={24} />
            <p className="text-sm text-stone-500 font-medium">Declined</p>
            <p className="text-3xl font-serif text-rose-500">{stats.totalDeclined}</p>
          </div>
        </div>

        {/* Add Guest Form */}
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-stone-100">
          <h2 className="text-xl font-serif mb-4 flex items-center gap-2">
            <UserPlus size={20} className="text-stone-400" />
            Add New Guest
          </h2>
          <form onSubmit={handleAddGuest} className="flex flex-col gap-4">
            {/* Top Row: Name, Category, Plus One */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
              <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-stone-500 mb-1">Guest Name</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Jane Doe"
                  className="w-full px-4 py-3 md:py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 transition-colors"
                  required
                />
              </div>
              <div className="w-full md:w-48">
                <label className="block text-sm font-medium text-stone-500 mb-1">Category</label>
                <select 
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-4 py-3 md:py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 transition-colors"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="w-full md:w-auto flex items-center h-[48px] md:h-[42px] px-2">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={newPlusOne}
                    onChange={(e) => setNewPlusOne(e.target.checked)}
                    className="w-6 h-6 md:w-5 md:h-5 rounded text-rose-500 border-stone-300 focus:ring-rose-400 focus:ring-offset-0 accent-rose-400"
                  />
                  <span className="text-base md:text-sm font-medium text-stone-600">Has Plus One?</span>
                </label>
              </div>
            </div>

            {/* Bottom Row: Address and Submit */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
               <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-stone-500 mb-1">Mailing Address (Optional)</label>
                <input 
                  type="text" 
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="123 Wedding Lane, Nashville, TN 37201"
                  className="w-full px-4 py-3 md:py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 transition-colors"
                />
              </div>
              <button 
                type="submit"
                disabled={!user}
                className="w-full md:w-auto px-8 py-3 md:py-2 h-[48px] md:h-[42px] bg-stone-800 hover:bg-stone-900 disabled:bg-stone-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                Add to List
              </button>
            </div>
          </form>
        </div>

        {/* Search Bar */}
        {guests.length > 0 && (
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-stone-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guests by name..."
              className="w-full pl-12 pr-4 py-3 md:py-4 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 shadow-sm transition-colors text-stone-700"
            />
          </div>
        )}

        {/* Guest Lists by Category */}
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
                            <button onClick={cancelEditing} className="px-4 py-2 text-sm font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors flex items-center gap-1"><X size={16}/> Cancel</button>
                            <button onClick={() => saveEdit(guest.id)} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1"><Save size={16}/> Save</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          
                          {/* Name, Address, Mail Trackers, and Plus One Status */}
                          <div className="flex-1 w-full lg:w-auto">
                            <div className="flex items-center gap-3 flex-wrap">
                              <p className="font-medium text-stone-900 text-lg break-words">{guest.name}</p>
                              {guest.plusOne && (
                                <span className="inline-flex items-center gap-1 text-xs font-medium bg-rose-50 text-rose-600 px-2 py-1 rounded-md border border-rose-100 whitespace-nowrap">
                                  <UserPlus size={12} /> +1 Included
                                </span>
                              )}
                            </div>
                            
                            {/* DISPLAY ADDRESS */}
                            {guest.address && (
                              <div className="flex items-start gap-1.5 mt-1.5 text-stone-500">
                                <MapPin size={14} className="mt-0.5 shrink-0 text-stone-400" />
                                <p className="text-sm whitespace-pre-wrap leading-tight">{guest.address}</p>
                              </div>
                            )}

                            {/* Mail Tracking Checkboxes */}
                            <div className="flex items-center gap-6 mt-3 pt-3 border-t border-stone-100 lg:border-none lg:pt-0 lg:mt-2">
                              <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer hover:text-stone-900 transition-colors">
                                <input 
                                  type="checkbox" 
                                  checked={guest.saveTheDateSent || false} 
                                  onChange={() => handleToggleMail(guest.id, 'saveTheDateSent', guest.saveTheDateSent)}
                                  className="w-4 h-4 rounded text-rose-500 border-stone-300 focus:ring-rose-400 focus:ring-offset-0 accent-rose-400"
                                />
                                Save the Date Sent
                              </label>
                              <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer hover:text-stone-900 transition-colors">
                                <input 
                                  type="checkbox" 
                                  checked={guest.inviteSent || false} 
                                  onChange={() => handleToggleMail(guest.id, 'inviteSent', guest.inviteSent)}
                                  className="w-4 h-4 rounded text-emerald-500 border-stone-300 focus:ring-emerald-400 focus:ring-offset-0 accent-emerald-500"
                                />
                                Invite Sent
                              </label>
                            </div>
                          </div>

                          {/* Controls */}
                          <div className="flex flex-wrap items-center justify-between lg:justify-end w-full lg:w-auto gap-3 mt-2 lg:mt-0">
                            
                            {/* Plus One Toggle */}
                            <label className="flex items-center gap-2 cursor-pointer bg-white border border-stone-200 px-3 py-1.5 rounded-lg hover:bg-stone-50 transition-colors flex-1 lg:flex-none justify-center">
                              <input 
                                type="checkbox"
                                checked={guest.plusOne}
                                onChange={() => handleTogglePlusOne(guest.id, guest.plusOne)}
                                className="w-4 h-4 rounded text-rose-500 border-stone-300 accent-rose-400"
                              />
                              <span className="text-sm text-stone-600 font-medium">Plus One</span>
                            </label>

                            {/* RSVP Dropdown */}
                            <div className="relative flex-1 lg:flex-none">
                              <select
                                value={guest.rsvpStatus}
                                onChange={(e) => handleUpdateRSVP(guest.id, e.target.value)}
                                className={`w-full appearance-none pr-8 pl-3 py-1.5 rounded-lg text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors ${
                                  guest.rsvpStatus === 'Attending' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 focus:ring-emerald-400' :
                                  guest.rsvpStatus === 'Declined' ? 'bg-rose-50 text-rose-700 border-rose-200 focus:ring-rose-400' :
                                  'bg-amber-50 text-amber-700 border-amber-200 focus:ring-amber-400'
                                }`}
                              >
                                {RSVP_STATUSES.map(status => (
                                  <option key={status} value={status}>{status}</option>
                                ))}
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-current opacity-50">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 lg:border-l lg:border-stone-200 lg:pl-3">
                              {/* Edit Button */}
                              <button 
                                onClick={() => startEditing(guest)}
                                className="text-stone-400 hover:text-emerald-600 p-2 hover:bg-emerald-50 rounded-lg transition-colors flex-shrink-0"
                                title="Edit guest"
                              >
                                <Edit2 size={18} />
                              </button>

                              {/* Delete Button */}
                              <button 
                                onClick={() => handleDeleteGuest(guest.id)}
                                className="text-stone-400 hover:text-rose-500 p-2 hover:bg-rose-50 rounded-lg transition-colors flex-shrink-0"
                                title="Remove guest"
                              >
                                <Trash2 size={18} />
                              </button>
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

          {/* No Search Results */}
          {guests.length > 0 && filteredGuests.length === 0 && (
            <div className="text-center py-16 px-4 bg-white rounded-2xl border border-stone-100 border-dashed">
              <Search className="mx-auto text-stone-200 mb-4" size={48} />
              <h3 className="text-lg font-serif text-stone-600 mb-1">No guests found</h3>
              <p className="text-stone-400 text-sm">We couldn't find anyone matching "{searchQuery}"</p>
            </div>
          )}
          
          {/* Empty Guest List */}
          {guests.length === 0 && (
            <div className="text-center py-16 px-4 bg-white rounded-2xl border border-stone-100 border-dashed">
              <h3 className="text-lg font-serif text-stone-600 mb-1">Your guest list is empty</h3>
              <p className="text-stone-400 text-sm">Add your first guest using the form above to start planning!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}