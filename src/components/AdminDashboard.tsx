import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Package, ShoppingCart, Users, FileText, Settings, 
  Plus, Edit, Trash2, Check, X, AlertCircle, TrendingUp, 
  Calendar, DollarSign, UserPlus, Search, Filter, ArrowUpRight, 
  ArrowDownRight, MoreVertical, Image as ImageIcon, Save, Globe,
  ChevronRight, LogOut, Menu, X as CloseIcon, Briefcase
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { 
  collection, query, getDocs, doc, setDoc, updateDoc, deleteDoc, 
  onSnapshot, orderBy, limit, where, Timestamp 
} from 'firebase/firestore';
import { GoogleGenAI, Type } from "@google/genai";
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { TRANSLATIONS } from '../App';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

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

// --- Helpers ---
const convertGoogleDriveLink = (url: string) => {
  if (!url) return '';
  // Handle Google Drive view link
  const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
  }
  return url;
};

const extractIframeSrc = (html: string) => {
  if (!html) return '';
  if (html.startsWith('<iframe')) {
    const srcMatch = html.match(/src="([^"]+)"/);
    if (srcMatch && srcMatch[1]) {
      return srcMatch[1];
    }
  }
  return html;
};

const safeFormatDate = (date: any, formatStr: string = 'yyyy-MM-dd') => {
  if (!date) return '-';
  try {
    const d = date.toDate ? date.toDate() : new Date(date);
    if (isNaN(d.getTime())) return '-';
    return format(d, formatStr);
  } catch (e) {
    return '-';
  }
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose, selectedLang }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [cmsContent, setCmsContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTranslating, setIsTranslating] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  
  // Product Registration State
  const [showAddProductForm, setShowAddProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [newProduct, setNewProduct] = useState<any>({
    title: { KO: '', EN: '', JA: '', ZH_CN: '', ZH_TW: '', ZH_HK: '' },
    location: { KO: '', EN: '', JA: '', ZH_CN: '', ZH_TW: '', ZH_HK: '' },
    description: { KO: '', EN: '', JA: '', ZH_CN: '', ZH_TW: '', ZH_HK: '' },
    introduction: { KO: '', EN: '', JA: '', ZH_CN: '', ZH_TW: '', ZH_HK: '' },
    whyRecommend: { KO: '', EN: '', JA: '', ZH_CN: '', ZH_TW: '', ZH_HK: '' },
    keepInMind: { KO: '', EN: '', JA: '', ZH_CN: '', ZH_TW: '', ZH_HK: '' },
    howToReserve: { KO: '', EN: '', JA: '', ZH_CN: '', ZH_TW: '', ZH_HK: '' },
    price: 0,
    originalPrice: 0,
    priceAdult: 0,
    priceChild: 0,
    category: 'tour',
    image: '',
    gallery: ['', '', ''],
    rating: 5.0,
    reviews: 0,
    bookedCount: 0,
    badge: { KO: '', EN: '', JA: '', ZH_CN: '', ZH_TW: '', ZH_HK: '' },
    address: { KO: '', EN: '', JA: '', ZH_CN: '', ZH_TW: '', ZH_HK: '' },
    mapUrl: '',
  });
  const [formTab, setFormTab] = useState('KO');

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), { status: newStatus });
      setNotification({ message: '예약 상태가 업데이트되었습니다.', type: 'success' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error("Error updating booking status:", error);
      setNotification({ message: '상태 업데이트 중 오류가 발생했습니다.', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleTranslateAll = async () => {
    if (isTranslating) return;
    
    const sourceLang = formTab;
    const targetLangs = ['KO', 'EN', 'JA', 'ZH_CN', 'ZH_TW', 'ZH_HK'].filter(l => l !== sourceLang);
    
    const fieldsToTranslate = [
      'title', 'location', 'description', 'introduction', 
      'whyRecommend', 'keepInMind', 'howToReserve', 'badge', 'address'
    ];
    
    const sourceData: any = {};
    fieldsToTranslate.forEach(field => {
      sourceData[field] = newProduct[field][sourceLang];
    });
    
    // Check if there's anything to translate
    if (Object.values(sourceData).every(v => !v)) {
      setNotification({ message: '번역할 내용이 없습니다.', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    setIsTranslating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = "gemini-3-flash-preview";
      
      const prompt = `Translate the following travel product information from ${sourceLang} to ${targetLangs.join(', ')}.
      The input data is a JSON object where keys are field names and values are the text to translate.
      Return the translations as a JSON object where each key is a target language code (EN, JA, ZH_CN, ZH_TW, ZH_HK, KO) and the value is another object with the translated fields.
      
      Input Data: ${JSON.stringify(sourceData)}
      
      Important:
      - Maintain the same field names.
      - Keep HTML tags if present (especially in description, introduction, etc.).
      - Ensure the tone is professional and inviting for a travel platform.
      - Return ONLY the JSON object.`;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: targetLangs.reduce((acc: any, lang) => {
              acc[lang] = {
                type: Type.OBJECT,
                properties: fieldsToTranslate.reduce((fAcc: any, field) => {
                  fAcc[field] = { type: Type.STRING };
                  return fAcc;
                }, {})
              };
              return acc;
            }, {})
          }
        }
      });

      const translations = JSON.parse(response.text);
      
      const updatedProduct = { ...newProduct };
      targetLangs.forEach(lang => {
        if (translations[lang]) {
          fieldsToTranslate.forEach(field => {
            if (translations[lang][field]) {
              updatedProduct[field] = {
                ...updatedProduct[field],
                [lang]: translations[lang][field]
              };
            }
          });
        }
      });
      
      setNewProduct(updatedProduct);
      setNotification({ message: '모든 언어로 번역이 완료되었습니다.', type: 'success' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error("Translation error:", error);
      setNotification({ message: '번역 중 오류가 발생했습니다.', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsTranslating(false);
    }
  };

  const formatPrice = (price: number) => {
    const langData = TRANSLATIONS[selectedLang] || TRANSLATIONS.KO;
    const rate = langData.exchangeRate || 1;
    const symbol = langData.currencySymbol || '₩';
    const converted = price / rate;
    
    if (selectedLang === 'EN') {
      return `${symbol}${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    
    return `${symbol}${Math.round(converted).toLocaleString()}`;
  };

  useEffect(() => {
    // Fetch real data from Firestore
    setLoading(true);

    const bookingsQuery = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribeBookings = onSnapshot(bookingsQuery, (snapshot) => {
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bookings');
    });

    const usersQuery = query(collection(db, 'users'), limit(50));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    // Products might be many, so we fetch them
    const productsQuery = query(collection(db, 'products'), limit(50));
    const unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
      setLoading(false);
    });

    return () => {
      unsubscribeBookings();
      unsubscribeUsers();
      unsubscribeProducts();
    };
  }, []);

  const handleSaveProduct = async () => {
    try {
      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), newProduct);
        setNotification({ message: '상품이 성공적으로 수정되었습니다.', type: 'success' });
      } else {
        const productRef = doc(collection(db, 'products'));
        await setDoc(productRef, {
          ...newProduct,
          id: productRef.id,
          createdAt: new Date().toISOString()
        });
        setNotification({ message: '신규 상품이 성공적으로 등록되었습니다.', type: 'success' });
      }
      setShowAddProductForm(false);
      setEditingProduct(null);
      setNewProduct({
        title: { KO: '', EN: '', JA: '', ZH_CN: '', ZH_TW: '', ZH_HK: '' },
        location: { KO: '', EN: '', JA: '', ZH_CN: '', ZH_TW: '', ZH_HK: '' },
        description: { KO: '', EN: '', JA: '', ZH_CN: '', ZH_TW: '', ZH_HK: '' },
        introduction: { KO: '', EN: '', JA: '', ZH_CN: '', ZH_TW: '', ZH_HK: '' },
        whyRecommend: { KO: '', EN: '', JA: '', ZH_CN: '', ZH_TW: '', ZH_HK: '' },
        keepInMind: { KO: '', EN: '', JA: '', ZH_CN: '', ZH_TW: '', ZH_HK: '' },
        howToReserve: { KO: '', EN: '', JA: '', ZH_CN: '', ZH_TW: '', ZH_HK: '' },
        price: 0,
        originalPrice: 0,
        priceAdult: 0,
        priceChild: 0,
        category: 'tour',
        image: '',
        gallery: ['', '', ''],
        rating: 5.0,
        reviews: 0,
        bookedCount: 0,
        badge: { KO: '', EN: '', JA: '', ZH_CN: '', ZH_TW: '', ZH_HK: '' },
        address: { KO: '', EN: '', JA: '', ZH_CN: '', ZH_TW: '', ZH_HK: '' },
        mapUrl: '',
      });
      
      // Clear notification after 3 seconds
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error("Error saving product:", error);
      setNotification({ message: '상품 저장 중 오류가 발생했습니다.', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    setConfirmModal({
      show: true,
      title: '상품 삭제',
      message: '정말로 이 상품을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'products', id));
          setNotification({ message: '상품이 삭제되었습니다.', type: 'success' });
          setTimeout(() => setNotification(null), 3000);
        } catch (error) {
          console.error("Error deleting product:", error);
          setNotification({ message: '상품 삭제 중 오류가 발생했습니다.', type: 'error' });
          setTimeout(() => setNotification(null), 3000);
        }
        setConfirmModal(null);
      }
    });
  };

  const renderProductForm = () => (
    <div className="bg-white rounded-2xl shadow-lg border border-black/5 overflow-hidden mb-8">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <h3 className="text-xl font-bold">{editingProduct ? '상품 수정' : '신규 상품 등록'}</h3>
        <button 
          onClick={() => {
            setShowAddProductForm(false);
            setEditingProduct(null);
          }}
          className="p-2 hover:bg-gray-200 rounded-full transition-colors"
        >
          <X size={20} />
        </button>
      </div>
      
      <div className="p-6 space-y-8">
        {/* Language Tabs & Translation */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-2 p-1 bg-gray-100 rounded-xl w-fit">
            {['KO', 'EN', 'JA', 'ZH_CN', 'ZH_TW', 'ZH_HK'].map(lang => (
              <button
                key={lang}
                onClick={() => setFormTab(lang)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  formTab === lang ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
          
          <button
            onClick={handleTranslateAll}
            disabled={isTranslating}
            className={`flex items-center space-x-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              isTranslating 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-yellow-500 text-white hover:bg-yellow-600 shadow-sm'
            }`}
          >
            <Globe size={14} className={isTranslating ? 'animate-spin' : ''} />
            <span>{isTranslating ? '번역 중...' : '모든 언어로 번역'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Basic Info */}
          <div className="space-y-6">
            <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">상품명 ({formTab})</label>
            <input 
              type="text" 
              value={newProduct.title[formTab]}
              onChange={(e) => setNewProduct({
                ...newProduct,
                title: { ...newProduct.title, [formTab]: e.target.value }
              })}
              className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-yellow-500/20"
              placeholder="상품명을 입력하세요..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">카테고리</label>
              <select 
                value={newProduct.category}
                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-yellow-500/20"
              >
                <option value="tour">투어</option>
                <option value="ticket">티켓</option>
                <option value="stay">숙박</option>
                <option value="transportation">교통</option>
                <option value="food">음식</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">위치 ({formTab})</label>
              <input 
                type="text" 
                value={newProduct.location[formTab]}
                onChange={(e) => setNewProduct({
                  ...newProduct,
                  location: { ...newProduct.location, [formTab]: e.target.value }
                })}
                className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-yellow-500/20"
                placeholder="예: 서울, 제주..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">성인 요금 (KRW)</label>
              <input 
                type="number" 
                value={newProduct.priceAdult || newProduct.price}
                onChange={(e) => setNewProduct({ ...newProduct, priceAdult: Number(e.target.value), price: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-yellow-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">아동 요금 (KRW)</label>
              <input 
                type="number" 
                value={newProduct.priceChild || 0}
                onChange={(e) => setNewProduct({ ...newProduct, priceChild: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-yellow-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">표시 요금 (KRW)</label>
              <input 
                type="number" 
                value={newProduct.price}
                onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-yellow-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">정상 요금 (KRW)</label>
              <input 
                type="number" 
                value={newProduct.originalPrice}
                onChange={(e) => setNewProduct({ ...newProduct, originalPrice: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-yellow-500/20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">메인 이미지 URL</label>
            <input 
              type="text" 
              value={newProduct.image}
              onChange={(e) => setNewProduct({ ...newProduct, image: convertGoogleDriveLink(e.target.value) })}
              className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-yellow-500/20"
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">배지 ({formTab})</label>
            <input 
              type="text" 
              value={newProduct.badge[formTab]}
              onChange={(e) => setNewProduct({
                ...newProduct,
                badge: { ...newProduct.badge, [formTab]: e.target.value }
              })}
              className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-yellow-500/20"
              placeholder="예: 베스트셀러, 즉시 확정..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">주소 ({formTab})</label>
            <input 
              type="text" 
              value={newProduct.address[formTab]}
              onChange={(e) => setNewProduct({
                ...newProduct,
                address: { ...newProduct.address, [formTab]: e.target.value }
              })}
              className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-yellow-500/20"
              placeholder="전체 주소를 입력하세요..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">지도 URL (구글 맵 임베드 링크)</label>
            <input 
              type="text" 
              value={newProduct.mapUrl}
              onChange={(e) => setNewProduct({ ...newProduct, mapUrl: extractIframeSrc(e.target.value) })}
              className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-yellow-500/20"
              placeholder="https://www.google.com/maps/embed?..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">갤러리 이미지 (URL)</label>
            <div className="space-y-2">
              {[0, 1, 2].map(idx => (
                <input 
                  key={idx}
                  type="text" 
                  value={newProduct.gallery[idx] || ''}
                  onChange={(e) => {
                    const newGallery = [...newProduct.gallery];
                    newGallery[idx] = convertGoogleDriveLink(e.target.value);
                    setNewProduct({ ...newProduct, gallery: newGallery });
                  }}
                  className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-yellow-500/20"
                  placeholder={`갤러리 이미지 ${idx + 1} URL...`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Rich Text Content */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">상품 소개 ({formTab})</label>
            <div className="h-64 mb-12">
              <ReactQuill 
                theme="snow" 
                value={newProduct.introduction[formTab]}
                onChange={(content) => setNewProduct({
                  ...newProduct,
                  introduction: { ...newProduct.introduction, [formTab]: content }
                })}
                className="h-full"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">추천 이유 ({formTab})</label>
            <div className="h-64 mb-12">
              <ReactQuill 
                theme="snow" 
                value={newProduct.whyRecommend[formTab]}
                onChange={(content) => setNewProduct({
                  ...newProduct,
                  whyRecommend: { ...newProduct.whyRecommend, [formTab]: content }
                })}
                className="h-full"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8 border-t border-gray-100 p-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">유의사항 ({formTab})</label>
            <div className="h-48 mb-12">
              <ReactQuill 
                theme="snow" 
                value={newProduct.keepInMind[formTab]}
                onChange={(content) => setNewProduct({
                  ...newProduct,
                  keepInMind: { ...newProduct.keepInMind, [formTab]: content }
                })}
                className="h-full"
              />
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">예약 방법 ({formTab})</label>
            <div className="h-48 mb-12">
              <ReactQuill 
                theme="snow" 
                value={newProduct.howToReserve[formTab]}
                onChange={(content) => setNewProduct({
                  ...newProduct,
                  howToReserve: { ...newProduct.howToReserve, [formTab]: content }
                })}
                className="h-full"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t border-gray-100 p-6">
        <button 
          onClick={handleSaveProduct}
          className="bg-yellow-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-yellow-600 transition-all flex items-center shadow-lg shadow-yellow-500/20"
        >
          <Save size={20} className="mr-2" />
          {editingProduct ? '상품 수정' : '상품 등록'}
        </button>
      </div>
    </div>
  </div>
);

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="총 매출" value={formatPrice(12450000)} change="+12.5%" icon={<DollarSign className="text-yellow-500" />} />
        <StatCard title="오늘의 예약" value="42" change="+5.2%" icon={<Calendar className="text-orange-500" />} />
        <StatCard title="신규 가입" value="128" change="+18.4%" icon={<UserPlus className="text-black" />} />
        <StatCard title="활성 상품" value="15" change="0%" icon={<Package className="text-gray-500" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
          <h3 className="text-lg font-bold mb-6 flex items-center">
            <TrendingUp size={20} className="mr-2 text-yellow-500" />
            매출 현황
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
            사용자 증가
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
          <h3 className="text-lg font-bold">최근 예약 내역</h3>
          <button className="text-sm text-yellow-600 font-medium hover:underline">전체 보기</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pb-4 font-semibold text-gray-500 text-sm">주문 번호</th>
                <th className="pb-4 font-semibold text-gray-500 text-sm">고객</th>
                <th className="pb-4 font-semibold text-gray-500 text-sm">상품</th>
                <th className="pb-4 font-semibold text-gray-500 text-sm">날짜</th>
                <th className="pb-4 font-semibold text-gray-500 text-sm">금액</th>
                <th className="pb-4 font-semibold text-gray-500 text-sm">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {bookings?.length > 0 ? bookings.slice(0, 5).map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4 text-sm font-mono">{booking.id.slice(0, 8)}</td>
                  <td className="py-4 text-sm">{booking.userEmail}</td>
                  <td className="py-4 text-sm">{booking.productTitle}</td>
                  <td className="py-4 text-sm">{booking.bookingDate}</td>
                  <td className="py-4 text-sm font-bold">{formatPrice(booking.amount || 0)}</td>
                  <td className="py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      booking.status === 'confirmed' ? 'bg-green-100 text-green-700' : 
                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                      'bg-red-100 text-red-700'
                    }`}>
                      {booking.status === 'confirmed' ? '확정' : 
                       booking.status === 'pending' ? '대기' : '취소'}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400 italic">최근 예약 내역이 없습니다.</td>
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
        <h2 className="text-2xl font-bold">재고 관리</h2>
        {!showAddProductForm && (
          <button 
            onClick={() => {
              setEditingProduct(null);
              setNewProduct({
                title: { KO: '', EN: '', JA: '', ZH_CN: '', ZH_TW: '', ZH_HK: '' },
                location: { KO: '', EN: '', JA: '', ZH_CN: '', ZH_TW: '', ZH_HK: '' },
                description: { KO: '', EN: '', JA: '', ZH_CN: '', ZH_TW: '', ZH_HK: '' },
                introduction: { KO: '', EN: '', JA: '', ZH_CN: '', ZH_TW: '', ZH_HK: '' },
                whyRecommend: { KO: '', EN: '', JA: '', ZH_CN: '', ZH_TW: '', ZH_HK: '' },
                keepInMind: { KO: '', EN: '', JA: '', ZH_CN: '', ZH_TW: '', ZH_HK: '' },
                howToReserve: { KO: '', EN: '', JA: '', ZH_CN: '', ZH_TW: '', ZH_HK: '' },
                price: 0,
                originalPrice: 0,
                priceAdult: 0,
                priceChild: 0,
                category: 'tour',
                image: '',
                gallery: ['', '', ''],
                rating: 5.0,
                reviews: 0,
                bookedCount: 0,
                badge: { KO: '', EN: '', JA: '', ZH_CN: '', ZH_TW: '', ZH_HK: '' },
                address: { KO: '', EN: '', JA: '', ZH_CN: '', ZH_TW: '', ZH_HK: '' },
                mapUrl: '',
              });
              setShowAddProductForm(true);
            }}
            className="bg-yellow-500 text-white px-4 py-2 rounded-xl font-bold flex items-center hover:bg-yellow-600 transition-colors"
          >
            <Plus size={18} className="mr-2" />
            신규 상품 등록
          </button>
        )}
      </div>

      {showAddProductForm && renderProductForm()}

      <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="상품 검색..." 
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
                <th className="p-4 font-semibold text-gray-500 text-sm">상품</th>
                <th className="p-4 font-semibold text-gray-500 text-sm">카테고리</th>
                <th className="p-4 font-semibold text-gray-500 text-sm">가격</th>
                <th className="p-4 font-semibold text-gray-500 text-sm">재고</th>
                <th className="p-4 font-semibold text-gray-500 text-sm">상태</th>
                <th className="p-4 font-semibold text-gray-500 text-sm">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products?.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <img src={product.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      <div>
                        <div className="font-bold text-sm">{product.title[selectedLang] || product.title['KO']}</div>
                        <div className="text-xs text-gray-400">{product.location?.[selectedLang] || product.location?.['KO']}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-600">{product.category}</td>
                  <td className="p-4 text-sm font-bold">{formatPrice(product.price || 0)}</td>
                  <td className="p-4 text-sm">
                    <div className="flex items-center">
                      <span className="font-mono">15</span>
                      <span className="text-gray-400 ml-1">/ 20</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase">
                      활성
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => {
                          const defaultProduct = {
                            title: { KO: '', EN: '', JA: '', ZH_CN: '', ZH_TW: '', ZH_HK: '' },
                            location: { KO: '', EN: '', JA: '', ZH_CN: '', ZH_TW: '', ZH_HK: '' },
                            description: { KO: '', EN: '', JA: '', ZH_CN: '', ZH_TW: '', ZH_HK: '' },
                            introduction: { KO: '', EN: '', JA: '', ZH_CN: '', ZH_TW: '', ZH_HK: '' },
                            whyRecommend: { KO: '', EN: '', JA: '', ZH_CN: '', ZH_TW: '', ZH_HK: '' },
                            keepInMind: { KO: '', EN: '', JA: '', ZH_CN: '', ZH_TW: '', ZH_HK: '' },
                            howToReserve: { KO: '', EN: '', JA: '', ZH_CN: '', ZH_TW: '', ZH_HK: '' },
                            price: 0,
                            originalPrice: 0,
                            priceAdult: 0,
                            priceChild: 0,
                            category: 'tour',
                            image: '',
                            gallery: ['', '', ''],
                            rating: 5.0,
                            reviews: 0,
                            bookedCount: 0,
                            badge: { KO: '', EN: '', JA: '', ZH_CN: '', ZH_TW: '', ZH_HK: '' },
                            address: { KO: '', EN: '', JA: '', ZH_CN: '', ZH_TW: '', ZH_HK: '' },
                            mapUrl: '',
                          };
                          setEditingProduct(product);
                          setNewProduct({ ...defaultProduct, ...product });
                          setShowAddProductForm(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
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
        <h2 className="text-2xl font-bold">주문 관리</h2>
        <div className="flex space-x-2">
          <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">CSV 내보내기</button>
          <button className="px-4 py-2 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800">일괄 정산</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex space-x-4">
            {['전체', '대기', '확정', '환불됨'].map(status => (
              <button 
                key={status}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  status === '전체' ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-100'
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
              placeholder="주문 번호 또는 이메일" 
              className="pl-9 pr-4 py-1.5 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-yellow-500/20 w-64"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="p-4 font-semibold text-gray-500 text-sm">주문 번호</th>
                <th className="p-4 font-semibold text-gray-500 text-sm">고객</th>
                <th className="p-4 font-semibold text-gray-500 text-sm">상품</th>
                <th className="p-4 font-semibold text-gray-500 text-sm">상태</th>
                <th className="p-4 font-semibold text-gray-500 text-sm">정산</th>
                <th className="p-4 font-semibold text-gray-500 text-sm">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {bookings?.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 text-sm font-mono">
                    <div>{booking.id.slice(0, 10)}</div>
                    <div className="text-[10px] text-gray-400">{booking.bookingDate || '-'}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm font-medium">{booking.userEmail}</div>
                    <div className="text-xs text-gray-400">{safeFormatDate(booking.createdAt, 'yyyy-MM-dd HH:mm')}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm font-bold">{booking.productTitle}</div>
                    <div className="text-xs text-gray-500">
                      {booking.adultCount > 0 && `성인 ${booking.adultCount} `}
                      {booking.childCount > 0 && `아동 ${booking.childCount}`}
                    </div>
                    <div className="text-xs font-bold text-[#FFB602] mt-1">{formatPrice(booking.amount || 0)}</div>
                  </td>
                  <td className="p-4">
                    <select 
                      className={`text-[10px] font-bold uppercase rounded-lg border-none focus:ring-0 cursor-pointer p-1 ${
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-700' : 
                        booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-red-100 text-red-700'
                      }`}
                      value={booking.status}
                      onChange={(e) => handleUpdateBookingStatus(booking.id, e.target.value)}
                    >
                      <option value="pending">대기</option>
                      <option value="confirmed">확정</option>
                      <option value="rejected">거절</option>
                      <option value="refunded">환불됨</option>
                    </select>
                  </td>
                  <td className="p-4">
                    <span className={`text-[10px] font-bold uppercase ${
                      booking.settlementStatus === 'completed' ? 'text-blue-600' : 'text-gray-400'
                    }`}>
                      {booking.settlementStatus === 'completed' ? '정산 완료' : '대기'}
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
        <h2 className="text-2xl font-bold">사용자 관리</h2>
        <div className="flex space-x-2">
          <button className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100">선택 항목 블랙리스트</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="이름 또는 이메일로 검색..." 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-yellow-500/20"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="p-4 font-semibold text-gray-500 text-sm">사용자</th>
                <th className="p-4 font-semibold text-gray-500 text-sm">권한</th>
                <th className="p-4 font-semibold text-gray-500 text-sm">가입일</th>
                <th className="p-4 font-semibold text-gray-500 text-sm">예약 수</th>
                <th className="p-4 font-semibold text-gray-500 text-sm">상태</th>
                <th className="p-4 font-semibold text-gray-500 text-sm">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users?.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {user.photoURL ? <img src={user.photoURL} alt="" /> : <Users size={20} className="text-gray-400" />}
                      </div>
                      <div>
                        <div className="font-bold text-sm">{user.displayName || '익명'}</div>
                        <div className="text-xs text-gray-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {user.role === 'admin' ? '관리자' : '사용자'}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    {safeFormatDate(user.createdAt)}
                  </td>
                  <td className="p-4 text-sm font-bold">3</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      user.isBlacklisted ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {user.isBlacklisted ? '차단됨' : '활성'}
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
        <h2 className="text-2xl font-bold">콘텐츠 관리</h2>
        <div className="flex space-x-2">
          <button className="bg-black text-white px-4 py-2 rounded-xl font-bold flex items-center hover:bg-gray-800 transition-colors">
            <Plus size={18} className="mr-2" />
            신규 콘텐츠
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CMSCard title="배너 광고" count={4} icon={<ImageIcon className="text-blue-500" />} />
        <CMSCard title="공지사항" count={12} icon={<FileText className="text-orange-500" />} />
        <CMSCard title="자주 묻는 질문" count={25} icon={<AlertCircle className="text-green-500" />} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-bold">최근 콘텐츠</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <FileText size={20} className="text-gray-400" />
                </div>
                <div>
                  <div className="font-bold text-sm">2026 봄 특별 이벤트</div>
                  <div className="text-xs text-gray-400">유형: 이벤트 • 업데이트: 2시간 전</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase">활성</span>
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
      <h2 className="text-2xl font-bold">시스템 설정</h2>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5 space-y-8">
        <section className="space-y-4">
          <h3 className="text-lg font-bold flex items-center">
            <Globe size={20} className="mr-2 text-blue-500" />
            사이트 정보
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">사이트 이름</label>
              <input type="text" defaultValue="Goldistrip" className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-yellow-500/20" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">기본 색상</label>
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
            SEO 메타 태그
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">메타 제목</label>
              <input type="text" defaultValue="Goldistrip - 현지 여행 플랫폼" className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-yellow-500/20" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">메타 설명</label>
              <textarea rows={3} className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-yellow-500/20 resize-none">Goldistrip과 함께 특별한 현지 체험과 숙소를 발견하세요.</textarea>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-bold flex items-center">
            <DollarSign size={20} className="mr-2 text-yellow-500" />
            결제 API 연동
          </h3>
          <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-100 flex items-start space-x-3">
            <AlertCircle className="text-yellow-600 mt-0.5" size={18} />
            <p className="text-sm text-yellow-800">
              결제 API 키는 민감한 정보입니다. 운영 환경에서는 환경 변수를 사용하세요.
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">결제 게이트웨이</label>
              <select className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-yellow-500/20">
                <option>토스 페이먼츠</option>
                <option>포트원 (아임포트)</option>
                <option>카카오페이</option>
              </select>
            </div>
          </div>
        </section>

        <div className="pt-4 flex justify-end">
          <button className="bg-black text-white px-8 py-3 rounded-xl font-bold flex items-center hover:bg-gray-800 transition-all shadow-lg shadow-black/10">
            <Save size={18} className="mr-2" />
            모든 설정 저장
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
              <span className="font-black text-xl tracking-tighter italic">Goldistrip Admin</span>
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
            label="대시보드" 
            collapsed={!isSidebarOpen} 
          />
          <NavItem 
            active={activeTab === 'inventory'} 
            onClick={() => setActiveTab('inventory')} 
            icon={<Package size={20} />} 
            label="재고 관리" 
            collapsed={!isSidebarOpen} 
          />
          <NavItem 
            active={activeTab === 'orders'} 
            onClick={() => setActiveTab('orders')} 
            icon={<ShoppingCart size={20} />} 
            label="주문 관리" 
            collapsed={!isSidebarOpen} 
          />
          <NavItem 
            active={activeTab === 'users'} 
            onClick={() => setActiveTab('users')} 
            icon={<Users size={20} />} 
            label="사용자 관리" 
            collapsed={!isSidebarOpen} 
          />
          <NavItem 
            active={activeTab === 'cms'} 
            onClick={() => setActiveTab('cms')} 
            icon={<FileText size={20} />} 
            label="콘텐츠 관리" 
            collapsed={!isSidebarOpen} 
          />
          <NavItem 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
            icon={<Settings size={20} />} 
            label="설정" 
            collapsed={!isSidebarOpen} 
          />
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={onClose}
            className="w-full flex items-center space-x-3 p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-bold"
          >
            <LogOut size={20} />
            {isSidebarOpen && <span>관리자 종료</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Notification Toast */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20, x: '-50%' }}
              animate={{ opacity: 1, y: 20, x: '-50%' }}
              exit={{ opacity: 0, y: -20, x: '-50%' }}
              className={`fixed top-4 left-1/2 z-[200] px-6 py-3 rounded-xl shadow-2xl flex items-center space-x-3 border ${
                notification.type === 'success' 
                  ? 'bg-green-50 border-green-100 text-green-800' 
                  : 'bg-red-50 border-red-100 text-red-800'
              }`}
            >
              {notification.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
              <span className="font-bold">{notification.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Confirmation Modal */}
        <AnimatePresence>
          {confirmModal?.show && (
            <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setConfirmModal(null)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full relative z-10 border border-black/5"
              >
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
                  <Trash2 className="text-red-500" size={32} />
                </div>
                <h3 className="text-2xl font-black mb-2">{confirmModal.title}</h3>
                <p className="text-gray-500 mb-8 leading-relaxed">{confirmModal.message}</p>
                <div className="flex space-x-3">
                  <button 
                    onClick={() => setConfirmModal(null)}
                    className="flex-1 px-6 py-3 rounded-xl font-bold bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    취소
                  </button>
                  <button 
                    onClick={confirmModal.onConfirm}
                    className="flex-1 px-6 py-3 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                  >
                    삭제하기
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <header className="h-16 bg-white border-b border-black/5 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-black capitalize">
              {activeTab === 'dashboard' ? '대시보드' : 
               activeTab === 'inventory' ? '재고 관리' :
               activeTab === 'orders' ? '주문 관리' :
               activeTab === 'users' ? '사용자 관리' :
               activeTab === 'cms' ? '콘텐츠 관리' : '설정'}
            </h1>
            <div className="h-4 w-px bg-gray-200"></div>
            <div className="text-sm text-gray-400 font-medium">
              {format(new Date(), 'yyyy년 M월 d일 EEEE', { locale: ko })}
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold">{auth.currentUser?.displayName || '관리자'}</div>
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">최고 관리자</div>
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
        <div className="text-xs text-gray-400">{count}개 항목</div>
      </div>
    </div>
    <ChevronRight size={20} className="text-gray-300 group-hover:text-yellow-500 transition-colors" />
  </div>
);
