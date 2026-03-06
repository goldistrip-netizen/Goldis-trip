import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Package, ShoppingCart, Users, FileText, Settings, 
  Plus, Edit, Trash2, Check, X, AlertCircle, TrendingUp, 
  Calendar, DollarSign, UserPlus, Search, Filter, ArrowUpRight, 
  ArrowDownRight, MoreVertical, Image as ImageIcon, Save, Globe,
  ChevronRight, LogOut, Menu, X as CloseIcon
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { 
  collection, query, getDocs, doc, setDoc, updateDoc, deleteDoc, 
  onSnapshot, orderBy, limit, where, Timestamp 
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
interface AdminDashboardProps {
  onClose: () => void;
  selectedLang: string;
}

type AdminTab = 'dashboard' | 'inventory' | 'orders' | 'users' | 'cms' | 'settings';

// --- Mock Data for Charts ---
const SALES_DATA = [
  { name: '03/01', sales: 4500000, bookings: 12 },
  { name: '03/02', sales: 5200000, bookings: 15 },
  { name: '03/03', sales: 3800000, bookings: 10 },
  { name: '03/04', sales: 6100000, bookings: 18 },
  { name: '03/05', sales: 4900000, bookings: 14 },
  { name: '03/06', sales: 7200000, bookings: 22 },
  { name: '03/07', sales: 8500000, bookings: 25 },
];

const USER_STATS = [
  { name: 'Mon', newUsers: 45 },
  { name: 'Tue', newUsers: 52 },
  { name: 'Wed', newUsers: 38 },
  { name: 'Thu', newUsers: 61 },
  { name: 'Fri', newUsers: 49 },
  { name: 'Sat', newUsers: 72 },
  { name: 'Sun', newUsers: 85 },
];

const CATEGORY_DATA = [
  { name: 'Theme Park', value: 400 },
  { name: 'Tour', value: 300 },
  { name: 'Food', value: 200 },
  { name: 'Stay', value: 500 },
];

const COLORS = ['#FFB602', '#FF6321', '#000000', '#4A4A4A'];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose, selectedLang }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [cmsContent, setCmsContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch real data from Firestore
    const fetchData = async () => {
      setLoading(true);
      try {
        // In a real app, we would fetch all these. For now, we'll use some mock state
        // but set up the listeners for real-time updates where possible.
        
        const bookingsQuery = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'), limit(50));
        const unsubscribeBookings = onSnapshot(bookingsQuery, (snapshot) => {
          setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const usersQuery = query(collection(db, 'users'), limit(50));
        const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
          setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // Products might be many, so we fetch them
        const productsQuery = query(collection(db, 'products'), limit(50));
        const unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
          setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        setLoading(false);
        return () => {
          unsubscribeBookings();
          unsubscribeUsers();
          unsubscribeProducts();
        };
      } catch (error) {
        console.error("Error fetching admin data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Sales" value="₩12,450,000" change="+12.5%" icon={<DollarSign className="text-yellow-500" />} />
        <StatCard title="Today's Bookings" value="42" change="+5.2%" icon={<Calendar className="text-orange-500" />} />
        <StatCard title="New Users" value="128" change="+18.4%" icon={<UserPlus className="text-black" />} />
        <StatCard title="Active Products" value="15" change="0%" icon={<Package className="text-gray-500" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
          <h3 className="text-lg font-bold mb-6 flex items-center">
            <TrendingUp size={20} className="mr-2 text-yellow-500" />
            Sales Performance
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={SALES_DATA}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFB602" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#FFB602" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#999'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#999'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#FFB602" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
          <h3 className="text-lg font-bold mb-6 flex items-center">
            <Users size={20} className="mr-2 text-orange-500" />
            User Growth
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={USER_STATS}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#999'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#999'}} />
                <Tooltip 
                  cursor={{fill: '#f8f8f8'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="newUsers" fill="#000000" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold">Recent Bookings</h3>
          <button className="text-sm text-yellow-600 font-medium hover:underline">View all</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pb-4 font-semibold text-gray-500 text-sm">Order ID</th>
                <th className="pb-4 font-semibold text-gray-500 text-sm">Customer</th>
                <th className="pb-4 font-semibold text-gray-500 text-sm">Product</th>
                <th className="pb-4 font-semibold text-gray-500 text-sm">Date</th>
                <th className="pb-4 font-semibold text-gray-500 text-sm">Amount</th>
                <th className="pb-4 font-semibold text-gray-500 text-sm">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {bookings.length > 0 ? bookings.slice(0, 5).map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4 text-sm font-mono">{booking.id.slice(0, 8)}</td>
                  <td className="py-4 text-sm">{booking.userEmail}</td>
                  <td className="py-4 text-sm">{booking.productTitle}</td>
                  <td className="py-4 text-sm">{booking.bookingDate}</td>
                  <td className="py-4 text-sm font-bold">₩{booking.amount?.toLocaleString()}</td>
                  <td className="py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      booking.status === 'confirmed' ? 'bg-green-100 text-green-700' : 
                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                      'bg-red-100 text-red-700'
                    }`}>
                      {booking.status}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400 italic">No recent bookings found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderInventory = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Inventory Management</h2>
        <button className="bg-yellow-500 text-white px-4 py-2 rounded-xl font-bold flex items-center hover:bg-yellow-600 transition-colors">
          <Plus size={18} className="mr-2" />
          Add New Product
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search products..." 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-yellow-500/20"
            />
          </div>
          <button className="p-2 bg-gray-50 rounded-xl text-gray-500 hover:bg-gray-100">
            <Filter size={20} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="p-4 font-semibold text-gray-500 text-sm">Product</th>
                <th className="p-4 font-semibold text-gray-500 text-sm">Category</th>
                <th className="p-4 font-semibold text-gray-500 text-sm">Price</th>
                <th className="p-4 font-semibold text-gray-500 text-sm">Stock</th>
                <th className="p-4 font-semibold text-gray-500 text-sm">Status</th>
                <th className="p-4 font-semibold text-gray-500 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <img src={product.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      <div>
                        <div className="font-bold text-sm">{product.title[selectedLang]}</div>
                        <div className="text-xs text-gray-400">{product.location?.[selectedLang]}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-600">{product.category}</td>
                  <td className="p-4 text-sm font-bold">₩{product.price?.toLocaleString()}</td>
                  <td className="p-4 text-sm">
                    <div className="flex items-center">
                      <span className="font-mono">15</span>
                      <span className="text-gray-400 ml-1">/ 20</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase">
                      Active
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <button className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors">
                        <Edit size={16} />
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderOrders = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Order Management</h2>
        <div className="flex space-x-2">
          <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">Export CSV</button>
          <button className="px-4 py-2 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800">Batch Settle</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex space-x-4">
            {['All', 'Pending', 'Confirmed', 'Refunded'].map(status => (
              <button 
                key={status}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  status === 'All' ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Order ID or Email" 
              className="pl-9 pr-4 py-1.5 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-yellow-500/20 w-64"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="p-4 font-semibold text-gray-500 text-sm">Order ID</th>
                <th className="p-4 font-semibold text-gray-500 text-sm">Customer</th>
                <th className="p-4 font-semibold text-gray-500 text-sm">Product</th>
                <th className="p-4 font-semibold text-gray-500 text-sm">Status</th>
                <th className="p-4 font-semibold text-gray-500 text-sm">Settlement</th>
                <th className="p-4 font-semibold text-gray-500 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 text-sm font-mono">{booking.id.slice(0, 10)}</td>
                  <td className="p-4">
                    <div className="text-sm font-medium">{booking.userEmail}</div>
                    <div className="text-xs text-gray-400">{format(new Date(booking.createdAt), 'yyyy-MM-dd HH:mm')}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm">{booking.productTitle}</div>
                    <div className="text-xs font-bold text-yellow-600">₩{booking.amount?.toLocaleString()}</div>
                  </td>
                  <td className="p-4">
                    <select 
                      className={`text-[10px] font-bold uppercase rounded-lg border-none focus:ring-0 cursor-pointer ${
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-700' : 
                        booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-red-100 text-red-700'
                      }`}
                      value={booking.status}
                      onChange={() => {}}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="rejected">Rejected</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </td>
                  <td className="p-4">
                    <span className={`text-[10px] font-bold uppercase ${
                      booking.settlementStatus === 'completed' ? 'text-blue-600' : 'text-gray-400'
                    }`}>
                      {booking.settlementStatus || 'Pending'}
                    </span>
                  </td>
                  <td className="p-4">
                    <button className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors">
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">User Management</h2>
        <div className="flex space-x-2">
          <button className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100">Blacklist Selected</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or email..." 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-yellow-500/20"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="p-4 font-semibold text-gray-500 text-sm">User</th>
                <th className="p-4 font-semibold text-gray-500 text-sm">Role</th>
                <th className="p-4 font-semibold text-gray-500 text-sm">Join Date</th>
                <th className="p-4 font-semibold text-gray-500 text-sm">Bookings</th>
                <th className="p-4 font-semibold text-gray-500 text-sm">Status</th>
                <th className="p-4 font-semibold text-gray-500 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {user.photoURL ? <img src={user.photoURL} alt="" /> : <Users size={20} className="text-gray-400" />}
                      </div>
                      <div>
                        <div className="font-bold text-sm">{user.displayName || 'Anonymous'}</div>
                        <div className="text-xs text-gray-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {user.role || 'user'}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    {user.createdAt ? format(new Date(user.createdAt), 'yyyy-MM-dd') : '-'}
                  </td>
                  <td className="p-4 text-sm font-bold">3</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      user.isBlacklisted ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {user.isBlacklisted ? 'Banned' : 'Active'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <button className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg">
                        <Edit size={16} />
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <AlertCircle size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderCMS = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Content Management</h2>
        <div className="flex space-x-2">
          <button className="bg-black text-white px-4 py-2 rounded-xl font-bold flex items-center hover:bg-gray-800 transition-colors">
            <Plus size={18} className="mr-2" />
            New Content
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CMSCard title="Banner Ads" count={4} icon={<ImageIcon className="text-blue-500" />} />
        <CMSCard title="Notices" count={12} icon={<FileText className="text-orange-500" />} />
        <CMSCard title="FAQs" count={25} icon={<AlertCircle className="text-green-500" />} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-bold">Recent Content</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <FileText size={20} className="text-gray-400" />
                </div>
                <div>
                  <div className="font-bold text-sm">Spring Special Event 2026</div>
                  <div className="text-xs text-gray-400">Type: Event • Updated: 2 hours ago</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase">Active</span>
                <button className="p-2 text-gray-400 hover:text-black"><Edit size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6 max-w-4xl">
      <h2 className="text-2xl font-bold">System Settings</h2>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5 space-y-8">
        <section className="space-y-4">
          <h3 className="text-lg font-bold flex items-center">
            <Globe size={20} className="mr-2 text-blue-500" />
            Site Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Site Name</label>
              <input type="text" defaultValue="Goldis trip" className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-yellow-500/20" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Primary Color</label>
              <div className="flex space-x-2">
                <input type="text" defaultValue="#FFB602" className="flex-1 px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-yellow-500/20" />
                <div className="w-10 h-10 rounded-xl bg-[#FFB602] border border-black/10"></div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-bold flex items-center">
            <Search size={20} className="mr-2 text-green-500" />
            SEO Meta Tags
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Meta Title</label>
              <input type="text" defaultValue="Goldis trip - Local Travel Platform" className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-yellow-500/20" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Meta Description</label>
              <textarea rows={3} className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-yellow-500/20 resize-none">Discover unique local experiences and accommodations with Goldis trip.</textarea>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-bold flex items-center">
            <DollarSign size={20} className="mr-2 text-yellow-500" />
            Payment API Integration
          </h3>
          <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-100 flex items-start space-x-3">
            <AlertCircle className="text-yellow-600 mt-0.5" size={18} />
            <p className="text-sm text-yellow-800">
              Payment API keys are sensitive. Make sure to use environment variables for production.
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Payment Gateway</label>
              <select className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-yellow-500/20">
                <option>Toss Payments</option>
                <option>PortOne (I'mport)</option>
                <option>KakaoPay</option>
              </select>
            </div>
          </div>
        </section>

        <div className="pt-4 flex justify-end">
          <button className="bg-black text-white px-8 py-3 rounded-xl font-bold flex items-center hover:bg-gray-800 transition-all shadow-lg shadow-black/10">
            <Save size={18} className="mr-2" />
            Save All Settings
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-gray-50 flex overflow-hidden font-sans text-[#141414]">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        className="bg-white border-r border-black/5 flex flex-col relative z-10"
      >
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-xl italic">G</span>
              </div>
              <span className="font-black text-xl tracking-tighter italic">Goldis Admin</span>
            </div>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"
          >
            <Menu size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <NavItem 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            collapsed={!isSidebarOpen} 
          />
          <NavItem 
            active={activeTab === 'inventory'} 
            onClick={() => setActiveTab('inventory')} 
            icon={<Package size={20} />} 
            label="Inventory" 
            collapsed={!isSidebarOpen} 
          />
          <NavItem 
            active={activeTab === 'orders'} 
            onClick={() => setActiveTab('orders')} 
            icon={<ShoppingCart size={20} />} 
            label="Orders" 
            collapsed={!isSidebarOpen} 
          />
          <NavItem 
            active={activeTab === 'users'} 
            onClick={() => setActiveTab('users')} 
            icon={<Users size={20} />} 
            label="Users" 
            collapsed={!isSidebarOpen} 
          />
          <NavItem 
            active={activeTab === 'cms'} 
            onClick={() => setActiveTab('cms')} 
            icon={<FileText size={20} />} 
            label="CMS" 
            collapsed={!isSidebarOpen} 
          />
          <NavItem 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
            icon={<Settings size={20} />} 
            label="Settings" 
            collapsed={!isSidebarOpen} 
          />
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={onClose}
            className="w-full flex items-center space-x-3 p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-bold"
          >
            <LogOut size={20} />
            {isSidebarOpen && <span>Exit Admin</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-black/5 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-black capitalize">{activeTab}</h1>
            <div className="h-4 w-px bg-gray-200"></div>
            <div className="text-sm text-gray-400 font-medium">
              {format(new Date(), 'EEEE, MMMM do yyyy')}
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold">{auth.currentUser?.displayName || 'Admin'}</div>
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Super Admin</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-yellow-500 flex items-center justify-center text-white font-bold">
                {auth.currentUser?.displayName?.[0] || 'A'}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && renderDashboard()}
              {activeTab === 'inventory' && renderInventory()}
              {activeTab === 'orders' && renderOrders()}
              {activeTab === 'users' && renderUsers()}
              {activeTab === 'cms' && renderCMS()}
              {activeTab === 'settings' && renderSettings()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

// --- Sub-components ---

const NavItem = ({ active, onClick, icon, label, collapsed }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all font-bold ${
      active 
        ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/20' 
        : 'text-gray-400 hover:bg-gray-50 hover:text-black'
    }`}
  >
    <div className="shrink-0">{icon}</div>
    {!collapsed && <span>{label}</span>}
  </button>
);

const StatCard = ({ title, value, change, icon }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-gray-50 rounded-xl">{icon}</div>
      <div className={`flex items-center text-xs font-bold ${change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
        {change.startsWith('+') ? <ArrowUpRight size={14} className="mr-0.5" /> : <ArrowDownRight size={14} className="mr-0.5" />}
        {change}
      </div>
    </div>
    <div className="text-2xl font-black">{value}</div>
    <div className="text-xs text-gray-400 font-medium mt-1 uppercase tracking-wider">{title}</div>
  </div>
);

const CMSCard = ({ title, count, icon }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5 flex items-center justify-between hover:border-yellow-500/30 transition-colors cursor-pointer group">
    <div className="flex items-center space-x-4">
      <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-yellow-50 transition-colors">{icon}</div>
      <div>
        <div className="font-bold">{title}</div>
        <div className="text-xs text-gray-400">{count} items</div>
      </div>
    </div>
    <ChevronRight size={20} className="text-gray-300 group-hover:text-yellow-500 transition-colors" />
  </div>
);
