/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, MapPin, Star, Calendar, User, ShoppingCart, 
  Heart, Menu, ChevronLeft, ArrowRight, Ticket, 
  Train, Bus, Utensils, Bed, ChevronDown, Share2,
  Instagram, Facebook, MessageCircle, Globe, X, LogOut,
  CreditCard, Settings, ChevronRight
} from 'lucide-react';
import { auth, db, googleProvider, facebookProvider, appleProvider } from './firebase';
import { 
  signInWithPopup, onAuthStateChanged, signOut, User as FirebaseUser 
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { AdminDashboard } from './components/AdminDashboard';

interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role?: 'user' | 'admin';
  isBlacklisted?: boolean;
  wishlist?: number[];
}

interface CartItem {
  id: number;
  title: any;
  price: number;
  image: string;
  quantity: number;
}

// --- 다국어 번역 데이터 ---
const TRANSLATIONS: any = {
  KO: {
    searchPlaceholder: "국내 여행지, 숙소, 액티비티 검색",
    heroSearchPlaceholder: "어느 지역으로 떠나시나요?",
    login: "로그인",
    heroTitle: "나만의 로컬 여행, Goldis trip에서 시작하세요",
    categoryTitle: "어떤 로컬 경험을 찾으시나요?",
    sectionTitle: "Goldis 추천 로컬 액티비티 & 숙소",
    searchResultTitle: "로컬 여행 결과",
    viewAll: "전체보기",
    noResult: "조건에 맞는 로컬 상품이 없습니다.",
    backToList: "목록으로 돌아가기",
    reviews: "개의 이용후기",
    selectDate: "날짜 선택",
    selectDatePlaceholder: "방문하실 날짜를 선택해주세요",
    totalPrice: "총 결제 금액",
    cart: "장바구니",
    bookNow: "예약하기",
    customerSupport: "고객 지원",
    faq: "자주 묻는 질문",
    terms: "이용 약관",
    privacy: "개인정보 처리방침",
    services: "서비스",
    experiences: "로컬 체험 및 티켓",
    accommodations: "감성 숙소 예약",
    transportation: "교통 / KTX",
    socialMedia: "소셜 미디어",
    langChanged: "언어가 한국어로 변경되었습니다.",
    booked: "예약이 완료되었습니다!",
    copied: "링크가 클립보드에 복사되었습니다!",
    searchBtn: "검색",
    won: "₩",
    loginTitle: "로그인",
    loginSubtitle: "Goldis trip의 다양한 혜택을 누려보세요",
    googleLogin: "Google로 로그인",
    facebookLogin: "Facebook으로 로그인",
    appleLogin: "Apple로 로그인",
    lineLogin: "LINE으로 로그인",
    loginSuccess: "로그인되었습니다.",
    logoutSuccess: "로그아웃되었습니다.",
    loginError: "로그인 중 오류가 발생했습니다.",
    myPage: "마이페이지",
    reservations: "예약내역",
    coupons: "쿠폰",
    paymentMethods: "결제수단",
    wishlist: "위시리스트",
    myProfile: "내 프로필",
    points: "포인트",
    membership: "멤버십",
    noReservations: "최근 예약 내역이 없습니다.",
    noCoupons: "사용 가능한 쿠폰이 없습니다.",
    noWishlist: "위시리스트가 비어 있습니다.",
    editProfile: "프로필 수정",
    cartEmpty: "장바구니가 비어 있습니다.",
    addedToCart: "장바구니에 담겼습니다.",
    addToCart: "장바구니 담기",
    adminDashboard: "관리자 대시보드",
    checkout: "결제하기",
    continueShopping: "계속 쇼핑하기",
    itemCount: "개"
  },
  EN: {
    searchPlaceholder: "Search destinations, stays, activities",
    heroSearchPlaceholder: "Where are you going?",
    login: "Login",
    heroTitle: "Start your local journey with Goldis trip",
    categoryTitle: "What local experience are you looking for?",
    sectionTitle: "Goldis Recommended Local Activities & Stays",
    searchResultTitle: "Local Travel Results",
    viewAll: "View All",
    noResult: "No local products found matching your criteria.",
    backToList: "Back to List",
    reviews: "Reviews",
    selectDate: "Select Date",
    selectDatePlaceholder: "Please select your visit date",
    totalPrice: "Total Amount",
    cart: "Cart",
    bookNow: "Book Now",
    customerSupport: "Support",
    faq: "FAQ",
    terms: "Terms of Use",
    privacy: "Privacy Policy",
    services: "Services",
    experiences: "Experiences & Tickets",
    accommodations: "Unique Stays",
    transportation: "Transport / KTX",
    socialMedia: "Social Media",
    langChanged: "Language changed to English.",
    booked: "Booking completed!",
    copied: "Link copied to clipboard!",
    searchBtn: "Search",
    won: "KRW",
    loginTitle: "Login",
    loginSubtitle: "Enjoy various benefits of Goldis trip",
    googleLogin: "Login with Google",
    facebookLogin: "Login with Facebook",
    appleLogin: "Login with Apple",
    lineLogin: "Login with LINE",
    loginSuccess: "Logged in successfully.",
    logoutSuccess: "Logged out successfully.",
    loginError: "An error occurred during login.",
    myPage: "My Page",
    reservations: "Reservations",
    coupons: "Coupons",
    paymentMethods: "Payments",
    wishlist: "Wishlist",
    myProfile: "My Profile",
    points: "Points",
    membership: "Membership",
    noReservations: "No recent reservations.",
    noCoupons: "No available coupons.",
    noWishlist: "Your wishlist is empty.",
    editProfile: "Edit Profile",
    cartEmpty: "Your cart is empty.",
    addedToCart: "Added to cart.",
    addToCart: "Add to Cart",
    adminDashboard: "Admin Dashboard",
    checkout: "Checkout",
    continueShopping: "Continue Shopping",
    itemCount: "items"
  },
  JA: {
    searchPlaceholder: "目的地、宿泊、アクティ비티を検索",
    heroSearchPlaceholder: "どこへ行きますか？",
    login: "ログイン",
    heroTitle: "あなただけのローカル旅行、Goldis tripで始めましょう",
    categoryTitle: "どのようなローカル体験をお探しですか？",
    sectionTitle: "Goldis おすすめのローカルアクティビティ＆宿泊",
    searchResultTitle: "ローカル旅行の検索結果",
    viewAll: "すべて見る",
    noResult: "条件に合うロー컬商品がありません。",
    backToList: "リストに戻る",
    reviews: "件のレビュー",
    selectDate: "日付選択",
    selectDatePlaceholder: "訪問日を選択してください",
    totalPrice: "合計金額",
    cart: "カート",
    bookNow: "予約する",
    customerSupport: "カスタマーサポート",
    faq: "よくある質問",
    terms: "利用規約",
    privacy: "個人情報保護方針",
    services: "サービス",
    experiences: "体験＆チケット",
    accommodations: "感性的な宿泊",
    transportation: "交通 / KTX",
    socialMedia: "ソーシャルメディア",
    langChanged: "言語が日本語に変更されました。",
    booked: "予約が完了しました！",
    copied: "링크がクリップボードにコピーされました！",
    searchBtn: "検索",
    won: "₩",
    loginTitle: "ログイン",
    loginSubtitle: "Goldis tripの多様な特典をお楽しみください",
    googleLogin: "Googleでログイン",
    facebookLogin: "Facebookでログイン",
    appleLogin: "Appleでログイン",
    lineLogin: "LINEでログイン",
    loginSuccess: "ログインしました。",
    logoutSuccess: "ログアウトしました。",
    loginError: "ログイン中にエラーが発生しました。",
    myPage: "マイページ",
    reservations: "予約履歴",
    coupons: "クーポン",
    paymentMethods: "決済手段",
    wishlist: "ウィッシュリスト",
    myProfile: "プロフィール",
    points: "ポイント",
    membership: "メンバーシップ",
    noReservations: "最近の予約履歴はありません。",
    noCoupons: "使用可能なクーポンはありません。",
    noWishlist: "ウィッシュリストは空です。",
    editProfile: "プロフィール編集",
    cartEmpty: "カートは空です。",
    addedToCart: "カートに追加されました。",
    checkout: "決済する",
    continueShopping: "ショッピングを続ける",
    itemCount: "個"
  },
  ZH: {
    searchPlaceholder: "搜索目的地、住宿、活动",
    heroSearchPlaceholder: "你要去哪里？",
    login: "登录",
    heroTitle: "在 Goldis trip 开启您的本地之旅",
    categoryTitle: "您在寻找什么样的本地体验？",
    sectionTitle: "Goldis 推荐的本地活动与住宿",
    searchResultTitle: "本地旅行搜索结果",
    viewAll: "查看全部",
    noResult: "没有找到符合条件的本地商品。",
    backToList: "返回列表",
    reviews: "条评价",
    selectDate: "选择日期",
    selectDatePlaceholder: "请选择您的访问日期",
    totalPrice: "总计金额",
    cart: "购物车",
    bookNow: "立即预订",
    customerSupport: "客户支持",
    faq: "常见问题",
    terms: "使用条款",
    privacy: "隐私政策",
    services: "服务",
    experiences: "体验与门票",
    accommodations: "特色住宿",
    transportation: "交通 / KTX",
    socialMedia: "社交媒体",
    langChanged: "语言已更改为中文。",
    booked: "预订已完成！",
    copied: "链接已复制到剪贴板！",
    searchBtn: "搜索",
    won: "₩",
    loginTitle: "登录",
    loginSubtitle: "享受 Goldis trip 的各项优惠",
    googleLogin: "使用 Google 登录",
    facebookLogin: "使用 Facebook 登录",
    appleLogin: "使用 Apple 登录",
    lineLogin: "使用 LINE 登录",
    loginSuccess: "登录成功。",
    logoutSuccess: "登出成功。",
    loginError: "登录时出错。",
    myPage: "个人中心",
    reservations: "预约记录",
    coupons: "优惠券",
    paymentMethods: "支付方式",
    wishlist: "愿望清单",
    myProfile: "我的资料",
    points: "积分",
    membership: "会员等级",
    noReservations: "暂无预约记录。",
    noCoupons: "暂无可用优惠券。",
    noWishlist: "愿望清单为空。",
    editProfile: "编辑资料",
    cartEmpty: "购物车为空。",
    addedToCart: "已加入购物车。",
    addToCart: "加入购物车",
    adminDashboard: "管理员仪表板",
    checkout: "去结算",
    continueShopping: "继续购物",
    itemCount: "件"
  }
};

// --- 가상 데이터 (Goldis trip - 국내 로컬 상품) ---
const CATEGORIES = [
  { id: 'all', name: { KO: '전체', EN: 'All', JA: 'すべて', ZH: '全部' }, icon: <MapPin size={20} /> },
  { id: 'theme-park', name: { KO: '테마파크/전시', EN: 'Theme Park/Exhibition', JA: 'テーマパーク/展示', ZH: '主题公园/展览' }, icon: <Ticket size={20} /> },
  { id: 'transport', name: { KO: '교통/이동', EN: 'Transport', JA: '交通/移動', ZH: '交通/移动' }, icon: <Train size={20} /> },
  { id: 'tour', name: { KO: '투어/체험', EN: 'Tour/Experience', JA: 'ツアー/体験', ZH: '旅游/体验' }, icon: <Bus size={20} /> },
  { id: 'food', name: { KO: '로컬 맛집', EN: 'Local Food', JA: 'ローカルグルメ', ZH: '本地美食' }, icon: <Utensils size={20} /> },
  { id: 'accommodation', name: { KO: '감성 숙소', EN: 'Unique Stays', JA: '感性的な宿泊', ZH: '特色住宿' }, icon: <Bed size={20} /> },
];

const MOCK_PRODUCTS = [
  {
    id: 1,
    title: {
      KO: "제주 아르떼뮤지엄 입장권",
      EN: "Jeju Arte Museum Ticket",
      JA: "済州アルテミュージアム入場券",
      ZH: "济州 Arte Museum 门票"
    },
    location: {
      KO: "제주특별자치도",
      EN: "Jeju Island",
      JA: "済州特別自治道",
      ZH: "济州特别自治道"
    },
    rating: 4.8,
    reviews: 12450,
    price: 17000,
    originalPrice: 17000,
    image: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=600&auto=format&fit=crop",
    category: "theme-park",
    badge: {
      KO: "제주 필수코스",
      EN: "Must-visit in Jeju",
      JA: "済州必須コース",
      ZH: "济州必去"
    },
    description: {
      KO: "국내 최대 규모의 몰입형 미디어아트 전시관. 빛과 소리가 만들어내는 영원한 자연의 공간에서 인생샷을 남겨보세요.",
      EN: "Korea's largest immersive media art exhibition hall. Leave a shot of your life in a space of eternal nature created by light and sound.",
      JA: "国内最大規模の没入型メディアアート展示館。光と音が作り出す永遠の自然의空間で、人生ショットを残してみてください。",
      ZH: "韩国最大规模的沉浸式媒体艺术展馆。在光与声交织的永恒自然空间中，留下您的人生照片。"
    }
  },
  {
    id: 2,
    title: {
      KO: "부산 해운대 선셋 요트 투어",
      EN: "Busan Haeundae Sunset Yacht Tour",
      JA: "釜山海雲台サンセットヨットツアー",
      ZH: "釜山海云台日落游艇之旅"
    },
    location: {
      KO: "부산광역시",
      EN: "Busan",
      JA: "釜山広域市",
      ZH: "釜山广域市"
    },
    rating: 4.9,
    reviews: 8300,
    price: 25000,
    originalPrice: 35000,
    image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=600&auto=format&fit=crop",
    category: "tour",
    badge: {
      KO: "특가",
      EN: "Special Offer",
      JA: "特価",
      ZH: "特价"
    },
    description: {
      KO: "광안대교를 배경으로 즐기는 로맨틱한 선셋 & 야경 요트 투어. 다과와 함께 부산의 바다를 럭셔리하게 즐겨보세요.",
      EN: "A romantic sunset & night view yacht tour with Gwangan Bridge in the background. Enjoy Busan's sea luxuriously with snacks.",
      JA: "広安大橋を背景に楽しむロマンチックなサンセット＆夜景ヨットツアー。お菓子と一緒に釜山の海を贅沢に楽しんでください。",
      ZH: "以广安大桥为背景的浪漫日落和夜景游艇之旅。一边享用茶点，一边奢华地享受釜山的大海。"
    }
  },
  {
    id: 3,
    title: {
      KO: "전주 한옥마을 한복 대여 (종일권 + 사진촬영)",
      EN: "Jeonju Hanok Village Hanbok Rental (Full Day + Photo Shoot)",
      JA: "全州韓屋村韓服レンタル（終日券 + 写真撮影）",
      ZH: "全州韩屋村韩服租赁（全天券 + 摄影）"
    },
    location: {
      KO: "전북 전주",
      EN: "Jeonju",
      JA: "全北全州",
      ZH: "全北全州"
    },
    rating: 4.7,
    reviews: 5120,
    price: 15000,
    image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=600&auto=format&fit=crop",
    category: "tour",
    description: {
      KO: "프리미엄 한복을 입고 전주 한옥마을의 골목골목을 거닐어보세요. 전문 작가의 스냅 촬영 옵션도 추가할 수 있습니다.",
      EN: "Stroll through the alleys of Jeonju Hanok Village in premium Hanbok. You can also add a professional photographer's snap shoot option.",
      JA: "プレミアム韓服を着て全州韓屋村の路地を歩いてみてください。専門作家のスナップ撮影オプションも追加できます。",
      ZH: "穿上高级韩服，漫步在全州韩屋村的街头巷尾。还可以添加专业摄影师的随拍选项。"
    }
  },
  {
    id: 4,
    title: {
      KO: "강릉-서울 KTX 편도 티켓 (자유석/입석)",
      EN: "Gangneung-Seoul KTX One-way Ticket (Unreserved/Standing)",
      JA: "江陵-ソウル KTX 片道チケット（自由席/立席）",
      ZH: "江陵-首尔 KTX 单程票（自由席/站票）"
    },
    location: {
      KO: "강원 강릉",
      EN: "Gangneung",
      JA: "江原江陵",
      ZH: "江原江陵"
    },
    rating: 4.5,
    reviews: 3200,
    price: 27600,
    image: "https://images.unsplash.com/photo-1544256718-3baf242d5471?q=80&w=600&auto=format&fit=crop",
    category: "transport",
    badge: {
      KO: "즉시 확정",
      EN: "Instant Confirmation",
      JA: "即時確定",
      ZH: "立即确认"
    },
    description: {
      KO: "동해바다로 떠나는 가장 빠르고 편안한 방법. 꽉 막힌 고속도로를 피해 KTX로 쾌적하게 여행하세요.",
      EN: "The fastest and most comfortable way to head to the East Sea. Travel comfortably by KTX, avoiding congested highways.",
      JA: "東海へ向かう最も速くて快適な方法。渋滞した高速道路を避けてKTXで快適に旅行してください。",
      ZH: "前往东海最快、最舒适的方式。避开拥挤的高速公路，乘坐 KTX 舒适出行。"
    }
  },
  {
    id: 5,
    title: {
      KO: "경주 황리단길 독채 감성 한옥 스테이 (1박)",
      EN: "Gyeongju Hwangnidan-gil Private Hanok Stay (1 Night)",
      JA: "慶州皇理団路 貸切感性韓屋ステイ（1泊）",
      ZH: "庆州皇理团路 独栋特色韩屋住宿（1晚）"
    },
    location: {
      KO: "경북 경주",
      EN: "Gyeongju",
      JA: "慶北慶州",
      ZH: "庆北庆州"
    },
    rating: 4.9,
    reviews: 1450,
    price: 180000,
    originalPrice: 220000,
    image: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=600&auto=format&fit=crop",
    category: "accommodation",
    badge: {
      KO: "인기 숙소",
      EN: "Popular Stay",
      JA: "人気の宿泊施設",
      ZH: "人气住宿"
    },
    description: {
      KO: "황리단길 중심에 위치한 프라이빗 독채 한옥입니다. 현대적인 편리함과 전통 한옥의 고즈넉함을 동시에 느껴보세요.",
      EN: "A private detached Hanok located in the center of Hwangnidan-gil. Feel the modern convenience and the tranquility of traditional Hanok at the same time.",
      JA: "皇理団路の中心に位置するプライベートな貸切韓屋です。現代的な便利さと伝統的な韓屋の静けさを同時に感じてみてください。",
      ZH: "位于皇理团路中心的私人独栋韩屋。同时感受现代便利与传统韩屋的幽静。"
    }
  },
  {
    id: 6,
    title: {
      KO: "제주 흑돼지 전문점 '돈사돈' 2인 식사권",
      EN: "Jeju Black Pork Restaurant 'Donsadon' Meal Voucher for 2",
      JA: "済州黒豚専門店 'ドンサドン' 2人食事券",
      ZH: "济州黑猪肉专门店 'Donsadon' 2人用餐券"
    },
    location: {
      KO: "제주특별자치도",
      EN: "Jeju Island",
      JA: "済州特別自治道",
      ZH: "济州特别自治道"
    },
    rating: 4.8,
    reviews: 6700,
    price: 66000,
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=600&auto=format&fit=crop",
    category: "food",
    description: {
      KO: "육즙이 팡팡 터지는 두툼한 제주 흑돼지 근고기. 웨이팅 없이 예약한 시간에 바로 입장하여 즐길 수 있는 식사권입니다.",
      EN: "Thick Jeju black pork with bursting juices. This is a meal voucher that allows you to enter and enjoy at your reserved time without waiting.",
      JA: "肉汁が溢れ出す厚みのある済州黒豚。待ち時間なしで予約した時間にすぐに入場して楽しめる食事券です。",
      ZH: "汁水四溢的厚切济州黑猪肉。这是一张用餐券，您可以按预约时间直接入场享用，无需排队。"
    }
  }
];

// --- 컴포넌트 ---

export default function App() {
  const [currentView, setCurrentView] = useState('home'); // 'home', 'detail'
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [toastMessage, setToastMessage] = useState('');
  const [selectedLang, setSelectedLang] = useState('KO');
  const [isLangOpen, setIsLangOpen] = useState(false);
  
  // Auth State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  
  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Wishlist State
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        // Initial sync
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          const newUser: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            role: 'user',
            wishlist: []
          };
          await setDoc(userRef, {
            ...newUser,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
          });
          setUser(newUser);
          setWishlist([]);
        } else {
          await updateDoc(userRef, { lastLogin: serverTimestamp() });
        }

        // Real-time profile sync
        unsubscribeProfile = onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            const data = doc.data() as UserProfile;
            setUser(data);
            setWishlist(data.wishlist || []);
          }
        });
      } else {
        setUser(null);
        setWishlist([]);
        if (unsubscribeProfile) unsubscribeProfile();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  // 번역 헬퍼 함수
  const t = (key: string) => {
    return TRANSLATIONS[selectedLang][key] || key;
  };

  // 로그인 처리
  const handleSocialLogin = async (provider: any) => {
    try {
      await signInWithPopup(auth, provider);
      setIsLoginModalOpen(false);
      setToastMessage(t('loginSuccess'));
      setTimeout(() => setToastMessage(''), 3000);
    } catch (error) {
      console.error("Login error:", error);
      setToastMessage(t('loginError'));
      setTimeout(() => setToastMessage(''), 3000);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsUserMenuOpen(false);
      setToastMessage(t('logoutSuccess'));
      setTimeout(() => setToastMessage(''), 3000);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // 장바구니 로직
  const addToCart = (product: any) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prevCart, { 
        id: product.id, 
        title: product.title, 
        price: product.price, 
        image: product.image, 
        quantity: 1 
      }];
    });
    setToastMessage(t('addedToCart'));
    setTimeout(() => setToastMessage(''), 3000);
  };

  const updateCartQuantity = (id: number, delta: number) => {
    setCart(prevCart => 
      prevCart.map(item => {
        if (item.id === id) {
          const newQuantity = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  const removeFromCart = (id: number) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id));
  };

  const toggleWishlist = async (productId: number) => {
    if (!user) {
      setIsLoginModalOpen(true);
      setToastMessage(selectedLang === 'KO' ? '로그인 후 이용 가능합니다.' : 'Please login to use this feature.');
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }
    
    const newWishlist = wishlist.includes(productId) 
      ? wishlist.filter(id => id !== productId) 
      : [...wishlist, productId];
    
    setWishlist(newWishlist);

    // Save to Firestore
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { wishlist: newWishlist });
    } catch (error) {
      console.error("Error updating wishlist:", error);
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const wishlistCount = wishlist.length;

  // 홈 화면으로 이동
  const goHome = () => {
    setCurrentView('home');
    setSelectedProduct(null);
    document.title = `Goldis trip | ${selectedLang === 'KO' ? '특별한 한국 여행의 시작' : 'Start your special Korea trip'}`;
  };

  // 상품 상세 화면으로 이동
  const goDetail = (product: any) => {
    setSelectedProduct(product);
    setCurrentView('detail');
    document.title = `${product.title[selectedLang]} | Goldis trip`;
    window.scrollTo(0, 0);
  };

  // 예약 버튼 클릭 처리
  const handleBook = () => {
    if (selectedProduct) {
      setToastMessage(`${selectedProduct.title[selectedLang]} ${t('booked')}`);
      setTimeout(() => setToastMessage(''), 3000);
    }
  };

  // 공유 버튼 클릭 처리
  const handleShare = () => {
    if (selectedProduct) {
      setToastMessage(t('copied'));
      setTimeout(() => setToastMessage(''), 3000);
    }
  };

  // 필터링된 상품 목록
  const filteredProducts = MOCK_PRODUCTS.filter(product => {
    const matchesCategory = activeCategory === 'all' || product.category === activeCategory;
    const title = product.title[selectedLang].toLowerCase();
    const location = product.location[selectedLang].toLowerCase();
    const matchesSearch = title.includes(searchQuery.toLowerCase()) || 
                          location.includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      {/* Admin Dashboard */}
      {isAdminDashboardOpen && (
        <AdminDashboard 
          selectedLang={selectedLang} 
          onClose={() => setIsAdminDashboardOpen(false)} 
        />
      )}

      {/* 알림(Toast) 메시지 */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-xl z-50 flex items-center space-x-2 animate-bounce">
          <ShoppingCart size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 네비게이션 바 */}
      <nav className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center cursor-pointer" onClick={goHome}>
              {/* 로고 이미지 */}
              <img 
                src="https://i.postimg.cc/J4bNSY3c/gibon-1.png" 
                alt="Goldis trip Logo" 
                className="h-7 sm:h-8 md:h-9 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            
            {/* 데스크탑 검색창 */}
            <div className="hidden md:flex flex-1 max-w-lg mx-8">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  className="w-full bg-gray-100 rounded-full py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-[#FFB602] focus:bg-white transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-4 top-3 text-gray-400" size={18} />
              </div>
            </div>

            {/* 우측 아이콘 메뉴 */}
            <div className="flex items-center space-x-4 md:space-x-6">
              {/* 다국어 선택 토글 */}
              <div className="relative">
                <button 
                  onClick={() => setIsLangOpen(!isLangOpen)}
                  className="flex items-center space-x-1 text-gray-600 hover:text-[#FFB602] transition-colors"
                >
                  <Globe size={20} />
                  <span className="text-xs font-bold uppercase">{selectedLang}</span>
                </button>
                
                {isLangOpen && (
                  <div className="absolute top-full right-0 mt-2 w-24 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
                    {['KO', 'EN', 'JA', 'ZH'].map((lang) => (
                      <button
                        key={lang}
                        onClick={() => {
                          setSelectedLang(lang);
                          setIsLangOpen(false);
                          setToastMessage(TRANSLATIONS[lang].langChanged);
                          setTimeout(() => setToastMessage(''), 2000);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-yellow-50 transition-colors ${selectedLang === lang ? 'text-[#FFB602] font-bold' : 'text-gray-600'}`}
                      >
                        {lang === 'KO' ? '한국어' : lang === 'EN' ? 'English' : lang === 'JA' ? '日本語' : '中文'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button 
                onClick={() => setIsWishlistOpen(true)}
                className="relative flex items-center space-x-1 text-gray-600 hover:text-[#FFB602] transition-colors"
              >
                <div className="relative">
                  <Heart size={22} fill={wishlistCount > 0 ? "currentColor" : "none"} className={wishlistCount > 0 ? "text-red-500" : ""} />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {wishlistCount}
                    </span>
                  )}
                </div>
                <span className="hidden lg:block text-sm font-medium">{t('wishlist')}</span>
              </button>
              <button 
                onClick={() => setIsCartOpen(true)}
                className="relative text-gray-600 hover:text-[#FFB602] transition-colors"
              >
                <ShoppingCart size={22} />
                {cartItemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </button>
              
              {user ? (
                <div className="relative">
                  <button 
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-2 text-gray-600 hover:text-[#FFB602] transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 border border-gray-100">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <User size={20} className="m-1.5" />
                      )}
                    </div>
                    <span className="hidden md:block text-sm font-medium max-w-[100px] truncate">
                      {user.displayName || user.email?.split('@')[0]}
                    </span>
                  </button>

                      {isUserMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-50">
                        <p className="text-xs text-gray-400 mb-1">Signed in as</p>
                        <p className="text-sm font-bold text-gray-800 truncate">{user.email}</p>
                      </div>
                      <button
                        onClick={() => {
                          setCurrentView('mypage');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center space-x-2"
                      >
                        <User size={16} />
                        <span>{t('myPage')}</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsWishlistOpen(true);
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center space-x-2"
                      >
                        <Heart size={16} />
                        <span>{t('wishlist')}</span>
                      </button>
                      {user.role === 'admin' && (
                        <button
                          onClick={() => {
                            setIsAdminDashboardOpen(true);
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full px-4 py-3 text-left text-sm text-yellow-600 hover:bg-yellow-50 transition-colors flex items-center space-x-2 font-bold"
                        >
                          <Settings size={16} />
                          <span>{t('adminDashboard')}</span>
                        </button>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-red-50 transition-colors border-t border-gray-50 flex items-center space-x-2"
                      >
                        <LogOut size={16} />
                        <span>{t('logout')}</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button 
                  onClick={() => setIsLoginModalOpen(true)}
                  className="hidden md:flex items-center space-x-1 text-gray-600 hover:text-[#FFB602] transition-colors"
                >
                  <User size={22} />
                  <span className="text-sm font-medium">{t('login')}</span>
                </button>
              )}
              <button className="md:hidden text-gray-600"><Menu size={24} /></button>
            </div>
          </div>
        </div>
      </nav>

      {/* 메인 컨텐츠 영역 */}
      {currentView === 'home' ? (
        <main>
          {/* 히어로 배너 섹션 (한국 풍경 이미지) */}
          <section className="relative h-[400px] md:h-[500px] bg-gray-900 flex items-center justify-center">
            <img 
              src="https://images.unsplash.com/photo-1515091943-9d5c0ad28b81?q=80&w=2000&auto=format&fit=crop" 
              alt="Korea Travel Background" 
              className="absolute inset-0 w-full h-full object-cover opacity-70"
              referrerPolicy="no-referrer"
            />
            <div className="relative z-10 text-center px-4 w-full max-w-3xl">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 drop-shadow-lg leading-tight">
                {t('heroTitle')}
              </h1>
              
              {/* 모바일 & 히어로 검색창 */}
              <div className="bg-white p-2 rounded-2xl shadow-2xl flex items-center">
                <div className="flex-1 flex items-center px-4">
                  <Search className="text-gray-400 mr-2" size={24} />
                  <input 
                    type="text" 
                    placeholder={t('heroSearchPlaceholder')} 
                    className="w-full py-3 text-lg focus:outline-none text-gray-800"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button className="bg-[#FFB602] text-white px-6 py-3 rounded-xl font-bold text-lg hover:bg-yellow-600 transition-colors hidden md:block">
                  {t('searchBtn')}
                </button>
              </div>
            </div>
          </section>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {/* 카테고리 필터 */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6">{t('categoryTitle')}</h2>
              <div className="flex overflow-x-auto pb-4 hide-scrollbar space-x-4">
                {CATEGORIES.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`flex flex-col items-center justify-center min-w-[85px] h-24 rounded-2xl border transition-all ${
                      activeCategory === category.id 
                        ? 'border-[#FFB602] bg-yellow-50 text-[#FFB602] shadow-sm' 
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="mb-2">{category.icon}</div>
                    <span className="text-sm font-medium">{category.name[selectedLang]}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* 상품 리스트 */}
            <section>
              <div className="flex justify-between items-end mb-6">
                <h2 className="text-2xl font-bold">
                  {searchQuery ? `'${searchQuery}' ${t('searchResultTitle')}` : t('sectionTitle')}
                </h2>
                <button className="text-[#FFB602] font-medium flex items-center hover:underline">
                  {t('viewAll')} <ArrowRight size={16} className="ml-1" />
                </button>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                  <p className="text-gray-500 text-lg">{t('noResult')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredProducts.map(product => (
                    <div 
                      key={product.id} 
                      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow cursor-pointer border border-gray-100 group"
                      onClick={() => goDetail(product)}
                    >
                      {/* 썸네일 */}
                      <div className="relative h-48 overflow-hidden">
                        <img 
                          src={product.image} 
                          alt={product.title[selectedLang]} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                        {product.badge && (
                          <div className="absolute top-3 left-3 bg-[#FFB602] text-white text-xs font-bold px-2 py-1 rounded">
                            {product.badge[selectedLang]}
                          </div>
                        )}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWishlist(product.id);
                          }}
                          className="absolute top-3 right-3 p-2 bg-white/70 backdrop-blur-sm rounded-full text-gray-600 hover:text-red-500 hover:bg-white transition-colors"
                        >
                          <Heart size={18} fill={wishlist.includes(product.id) ? "currentColor" : "none"} className={wishlist.includes(product.id) ? "text-red-500" : ""} />
                        </button>
                      </div>
                      
                      {/* 정보 */}
                      <div className="p-4">
                        <div className="flex items-center text-xs text-gray-500 mb-2 space-x-2">
                          <span className="flex items-center"><MapPin size={12} className="mr-1"/>{product.location[selectedLang]}</span>
                          <span className="flex items-center text-[#FFB602]">
                            <Star size={12} fill="currentColor" className="mr-1"/>
                            {product.rating} ({product.reviews.toLocaleString()})
                          </span>
                        </div>
                        <h3 className="font-bold text-gray-800 leading-tight mb-3 h-10 line-clamp-2 group-hover:text-[#FFB602] transition-colors">
                          {product.title[selectedLang]}
                        </h3>
                        
                        <div className="flex items-end justify-between mt-4">
                          <div>
                            {product.originalPrice && (
                              <p className="text-xs text-gray-400 line-through mb-0.5">
                                {t('won')} {product.originalPrice.toLocaleString()}
                              </p>
                            )}
                            <p className="text-lg font-extrabold text-gray-900">
                              <span className="text-sm font-normal mr-1">{t('won')}</span>
                              {product.price.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      ) : currentView === 'mypage' ? (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center mb-8">
            <button 
              onClick={goHome}
              className="p-2 mr-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{t('myPage')}</h1>
          </div>

          {/* 프로필 요약 카드 */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 mb-8 flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-4 border-yellow-50 shadow-inner">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User size={48} className="m-6 text-gray-300" />
              )}
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{user?.displayName || user?.email?.split('@')[0]}</h2>
              <p className="text-gray-500 mb-4">{user?.email}</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <div className="bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-400 uppercase font-bold mb-1">{t('membership')}</p>
                  <p className="text-sm font-bold text-[#FFB602]">Goldis Family</p>
                </div>
                <div className="bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-400 uppercase font-bold mb-1">{t('points')}</p>
                  <p className="text-sm font-bold text-gray-800">2,500 P</p>
                </div>
              </div>
            </div>
            <button className="flex items-center space-x-2 px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">
              <Settings size={18} />
              <span>{t('editProfile')}</span>
            </button>
          </div>

          {/* 마이페이지 메뉴 그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {/* 예약 내역 */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-lg flex items-center">
                  <Calendar size={20} className="mr-2 text-[#FFB602]" />
                  {t('reservations')}
                </h3>
                <ChevronRight size={18} className="text-gray-300" />
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-2xl transition-colors cursor-pointer border border-transparent hover:border-gray-100">
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                    <img src="https://images.unsplash.com/photo-1515091943-9d5c0ad28b81?q=80&w=200&auto=format&fit=crop" className="w-full h-full object-cover" alt="Reservation" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#FFB602] font-bold mb-1">2026.04.15</p>
                    <p className="text-sm font-bold text-gray-800 truncate">경복궁 야간 개장 투어</p>
                    <p className="text-xs text-gray-400">Confirmed</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-2xl transition-colors cursor-pointer border border-transparent hover:border-gray-100">
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                    <img src="https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=200&auto=format&fit=crop" className="w-full h-full object-cover" alt="Reservation" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#FFB602] font-bold mb-1">2026.05.20</p>
                    <p className="text-sm font-bold text-gray-800 truncate">경주 황리단길 한옥 스테이</p>
                    <p className="text-xs text-gray-400">Pending</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 쿠폰함 */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-lg flex items-center">
                  <Ticket size={20} className="mr-2 text-[#FFB602]" />
                  {t('coupons')}
                </h3>
                <span className="bg-red-100 text-red-500 text-xs font-bold px-2 py-0.5 rounded-full">2</span>
              </div>
              <div className="p-6 space-y-3">
                <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-100 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-yellow-600 font-bold mb-1">Welcome Coupon</p>
                    <p className="font-bold text-gray-800">10% Discount</p>
                  </div>
                  <button className="text-xs font-bold text-[#FFB602] underline">Use</button>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center opacity-60">
                  <div>
                    <p className="text-xs text-gray-400 font-bold mb-1">Local Experience</p>
                    <p className="font-bold text-gray-800">₩ 5,000 Off</p>
                  </div>
                  <span className="text-xs font-bold text-gray-400">Expired</span>
                </div>
              </div>
            </div>

            {/* 결제 수단 */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-lg flex items-center">
                  <CreditCard size={20} className="mr-2 text-[#FFB602]" />
                  {t('paymentMethods')}
                </h3>
                <ChevronRight size={18} className="text-gray-300" />
              </div>
              <div className="p-6">
                <div className="flex items-center p-4 border border-dashed border-gray-200 rounded-2xl text-gray-400 hover:border-[#FFB602] hover:text-[#FFB602] transition-all cursor-pointer group">
                  <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center mr-4 group-hover:bg-yellow-50">
                    <CreditCard size={20} />
                  </div>
                  <span className="text-sm font-bold">+ Add New Card</span>
                </div>
              </div>
            </div>

            {/* 위시리스트 */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-lg flex items-center">
                  <Heart size={20} className="mr-2 text-[#FFB602]" />
                  {t('wishlist')}
                </h3>
                <ChevronRight size={18} className="text-gray-300" />
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-2xl transition-colors cursor-pointer border border-transparent hover:border-gray-100">
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                    <img src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=200&auto=format&fit=crop" className="w-full h-full object-cover" alt="Wishlist" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">제주 흑돼지 전문점 '돈사돈'</p>
                    <p className="text-xs text-[#FFB602] font-bold">₩ 66,000</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-2xl transition-colors cursor-pointer border border-transparent hover:border-gray-100">
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                    <img src="https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=200&auto=format&fit=crop" className="w-full h-full object-cover" alt="Wishlist" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">전주 한옥마을 한복 대여</p>
                    <p className="text-xs text-[#FFB602] font-bold">₩ 15,000</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      ) : (
        // --- 상세 페이지 영역 ---
        <main className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 py-0 sm:py-8">
          <button 
            onClick={goHome}
            className="hidden sm:flex items-center text-gray-600 hover:text-[#FFB602] mb-6 transition-colors"
          >
            <ChevronLeft size={20} className="mr-1" /> {t('backToList')}
          </button>

          <div className="bg-white sm:rounded-3xl sm:shadow-lg overflow-hidden flex flex-col md:flex-row">
            {/* 모바일용 뒤로가기 버튼 (이미지 위) */}
            <div className="relative md:w-1/2 h-64 sm:h-auto min-h-[400px]">
              <button 
                onClick={goHome}
                className="sm:hidden absolute top-4 left-4 z-10 p-2 bg-white/80 backdrop-blur-md rounded-full text-gray-800 shadow-sm"
              >
                <ChevronLeft size={24} />
              </button>
              <img 
                src={selectedProduct.image} 
                alt={selectedProduct.title[selectedLang]} 
                className="absolute inset-0 w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* 상품 상세 정보 */}
            <div className="md:w-1/2 p-6 md:p-10 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded text-xs font-semibold flex items-center">
                    <MapPin size={12} className="mr-1"/> {selectedProduct.location[selectedLang]}
                  </span>
                  {selectedProduct.badge && (
                    <span className="bg-yellow-100 text-[#FFB602] px-2.5 py-1 rounded text-xs font-semibold">
                      {selectedProduct.badge[selectedLang]}
                    </span>
                  )}
                </div>
                
                <div className="flex justify-between items-start">
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    {selectedProduct.title[selectedLang]}
                  </h1>
                  <button 
                    onClick={handleShare}
                    className="p-2 text-gray-400 hover:text-[#FFB602] transition-colors"
                  >
                    <Share2 size={24} />
                  </button>
                </div>
                
                <div className="flex items-center mb-6 pb-6 border-b border-gray-100">
                  <div className="flex items-center text-[#FFB602] font-bold text-lg">
                    <Star size={20} fill="currentColor" className="mr-1"/>
                    {selectedProduct.rating}
                  </div>
                  <span className="mx-3 text-gray-300">|</span>
                  <span className="text-gray-500 underline cursor-pointer">
                    {selectedProduct.reviews.toLocaleString()} {t('reviews')}
                  </span>
                </div>

                <p className="text-gray-600 leading-relaxed mb-8">
                  {selectedProduct.description[selectedLang]}
                </p>

                {/* 옵션 선택 (UI만 구현) */}
                <div className="space-y-4 mb-8">
                  <h3 className="font-bold text-lg">{t('selectDate')}</h3>
                  <button className="w-full flex justify-between items-center border border-gray-300 rounded-xl p-4 hover:border-[#FFB602] transition-colors bg-white text-left">
                    <span className="flex items-center text-gray-700">
                      <Calendar size={20} className="mr-3 text-gray-400" />
                      {t('selectDatePlaceholder')}
                    </span>
                    <ChevronDown size={20} className="text-gray-400" />
                  </button>
                </div>
              </div>

              {/* 결제 요약 및 버튼 */}
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <div className="flex justify-between items-end mb-6">
                  <span className="text-gray-600 font-medium">{t('totalPrice')}</span>
                  <div className="text-right">
                    {selectedProduct.originalPrice && (
                      <p className="text-sm text-gray-400 line-through mb-1">
                        {t('won')} {selectedProduct.originalPrice.toLocaleString()}
                      </p>
                    )}
                    <p className="text-3xl font-extrabold text-[#FFB602]">
                      {t('won')} {selectedProduct.price.toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <button 
                    onClick={() => toggleWishlist(selectedProduct.id)}
                    className="p-4 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center bg-white"
                  >
                    <Heart size={24} fill={wishlist.includes(selectedProduct.id) ? "currentColor" : "none"} className={wishlist.includes(selectedProduct.id) ? "text-red-500" : ""} />
                  </button>
                  <button 
                    onClick={() => addToCart(selectedProduct)}
                    className="flex-1 border border-[#FFB602] text-[#FFB602] rounded-xl font-bold text-lg hover:bg-yellow-50 transition-colors bg-white"
                  >
                    {t('cart')}
                  </button>
                  <button 
                    onClick={handleBook}
                    className="flex-1 bg-[#FFB602] text-white rounded-xl font-bold text-lg hover:bg-yellow-600 transition-colors shadow-lg shadow-yellow-200"
                  >
                    {t('bookNow')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* 푸터 */}
      <footer className="bg-gray-900 text-gray-400 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-white font-bold mb-4">{t('customerSupport')}</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-[#FFB602] transition-colors">{t('faq')}</a></li>
                <li><a href="#" className="hover:text-[#FFB602] transition-colors">{t('terms')}</a></li>
                <li><a href="#" className="hover:text-[#FFB602] transition-colors">{t('privacy')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">{t('services')}</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-[#FFB602] transition-colors">{t('experiences')}</a></li>
                <li><a href="#" className="hover:text-[#FFB602] transition-colors">{t('accommodations')}</a></li>
                <li><a href="#" className="hover:text-[#FFB602] transition-colors">{t('transportation')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">{t('socialMedia')}</h4>
              <div className="flex space-x-4">
                <a href="#" className="p-2 bg-gray-800 rounded-full hover:bg-[#FFB602] hover:text-white transition-all">
                  <Instagram size={20} />
                </a>
                <a href="#" className="p-2 bg-gray-800 rounded-full hover:bg-[#FFB602] hover:text-white transition-all">
                  <Facebook size={20} />
                </a>
                <a href="#" className="p-2 bg-gray-800 rounded-full hover:bg-[#FFB602] hover:text-white transition-all">
                  <MessageCircle size={20} />
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <img 
                src="https://i.postimg.cc/J4bNSY3c/gibon-1.png" 
                alt="Goldis trip Logo" 
                className="h-6 sm:h-7 w-auto object-contain brightness-0 invert"
                referrerPolicy="no-referrer"
              />
            </div>
            <p className="text-sm">© 2026 Goldis trip Prototype. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* 찜 목록 모달 */}
      {isWishlistOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 flex justify-between items-center border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <Heart size={24} className="mr-2 text-red-500 fill-red-500" />
                {t('wishlist')}
                <span className="ml-2 text-sm text-gray-400 font-normal">
                  ({wishlistCount})
                </span>
              </h3>
              <button 
                onClick={() => setIsWishlistOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {wishlist.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <Heart size={32} className="text-gray-200" />
                  </div>
                  <p className="text-gray-500 font-medium mb-6">
                    {t('noWishlist')}
                  </p>
                  <button 
                    onClick={() => setIsWishlistOpen(false)}
                    className="px-6 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                  >
                    {t('continueShopping')}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {wishlist.map((productId) => {
                    const product = MOCK_PRODUCTS.find(p => p.id === productId);
                    if (!product) return null;
                    return (
                      <div key={product.id} className="flex space-x-4 group">
                        <div 
                          className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100 cursor-pointer"
                          onClick={() => {
                            setSelectedProduct(product);
                            setCurrentView('detail');
                            setIsWishlistOpen(false);
                          }}
                        >
                          <img src={product.image} alt={product.title[selectedLang]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <h4 
                              className="font-bold text-gray-900 truncate pr-2 cursor-pointer hover:text-[#FFB602] transition-colors"
                              onClick={() => {
                                setSelectedProduct(product);
                                setCurrentView('detail');
                                setIsWishlistOpen(false);
                              }}
                            >
                              {product.title[selectedLang]}
                            </h4>
                            <button 
                              onClick={() => toggleWishlist(product.id)}
                              className="text-red-500 hover:text-gray-300 transition-colors"
                            >
                              <Heart size={18} fill="currentColor" />
                            </button>
                          </div>
                          <p className="text-[#FFB602] font-bold mb-3">
                            {t('won')} {product.price.toLocaleString()}
                          </p>
                          <button 
                            onClick={() => {
                              addToCart(product);
                              setIsWishlistOpen(false);
                              setIsCartOpen(true);
                            }}
                            className="text-xs font-bold text-gray-600 hover:text-[#FFB602] flex items-center transition-colors"
                          >
                            <ShoppingCart size={14} className="mr-1" />
                            {t('addToCart')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 장바구니 모달 */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 flex justify-between items-center border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <ShoppingCart size={24} className="mr-2 text-[#FFB602]" />
                {t('cart')}
                <span className="ml-2 text-sm text-gray-400 font-normal">
                  ({cartItemCount} {t('itemCount')})
                </span>
              </h3>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <ShoppingCart size={32} className="text-gray-200" />
                  </div>
                  <p className="text-gray-500 font-medium mb-6">{t('cartEmpty')}</p>
                  <button 
                    onClick={() => setIsCartOpen(false)}
                    className="px-6 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                  >
                    {t('continueShopping')}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {cart.map((item) => (
                    <div key={item.id} className="flex space-x-4">
                      <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100">
                        <img src={item.image} alt={item.title[selectedLang]} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-bold text-gray-900 truncate pr-2">
                            {item.title[selectedLang]}
                          </h4>
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            className="text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <X size={18} />
                          </button>
                        </div>
                        <p className="text-[#FFB602] font-bold mb-3">
                          {t('won')} {item.price.toLocaleString()}
                        </p>
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                            <button 
                              onClick={() => updateCartQuantity(item.id, -1)}
                              className="px-2 py-1 hover:bg-gray-50 text-gray-500 border-r border-gray-200"
                            >
                              -
                            </button>
                            <span className="px-4 py-1 text-sm font-bold text-gray-700 bg-white">
                              {item.quantity}
                            </span>
                            <button 
                              onClick={() => updateCartQuantity(item.id, 1)}
                              className="px-2 py-1 hover:bg-gray-50 text-gray-500 border-l border-gray-200"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-xs text-gray-400 font-medium">
                            Subtotal: {t('won')} {(item.price * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 border-t border-gray-100 bg-gray-50">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-gray-600 font-medium">{t('totalPrice')}</span>
                  <span className="text-2xl font-extrabold text-[#FFB602]">
                    {t('won')} {cartTotal.toLocaleString()}
                  </span>
                </div>
                <button 
                  onClick={() => {
                    handleBook();
                    setIsCartOpen(false);
                  }}
                  className="w-full bg-[#FFB602] text-white py-4 rounded-2xl font-bold text-lg hover:bg-yellow-600 transition-all shadow-lg shadow-yellow-100 flex items-center justify-center"
                >
                  <CreditCard size={20} className="mr-2" />
                  {t('checkout')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 로그인 모달 */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 flex justify-between items-center border-b border-gray-50">
              <h3 className="text-xl font-bold text-gray-900">{t('loginTitle')}</h3>
              <button 
                onClick={() => setIsLoginModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8">
              <div className="text-center mb-8">
                <img 
                  src="https://i.postimg.cc/J4bNSY3c/gibon-1.png" 
                  alt="Goldis trip Logo" 
                  className="h-10 mx-auto mb-4"
                  referrerPolicy="no-referrer"
                />
                <p className="text-gray-500">{t('loginSubtitle')}</p>
              </div>

              <div className="space-y-3">
                {/* Google Login */}
                <button 
                  onClick={() => handleSocialLogin(googleProvider)}
                  className="w-full flex items-center justify-center space-x-3 py-3.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-medium text-gray-700"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                  <span>{t('googleLogin')}</span>
                </button>

                {/* Apple Login */}
                <button 
                  onClick={() => handleSocialLogin(appleProvider)}
                  className="w-full flex items-center justify-center space-x-3 py-3.5 bg-black text-white rounded-xl hover:bg-gray-900 transition-all font-medium"
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" alt="Apple" className="w-5 h-5 invert" />
                  <span>{t('appleLogin')}</span>
                </button>

                {/* Facebook Login */}
                <button 
                  onClick={() => handleSocialLogin(facebookProvider)}
                  className="w-full flex items-center justify-center space-x-3 py-3.5 bg-[#1877F2] text-white rounded-xl hover:bg-[#166fe5] transition-all font-medium"
                >
                  <Facebook size={20} fill="white" />
                  <span>{t('facebookLogin')}</span>
                </button>

                {/* Line Login (Placeholder for now as it requires more complex setup) */}
                <button 
                  onClick={() => setToastMessage("LINE Login requires additional configuration.")}
                  className="w-full flex items-center justify-center space-x-3 py-3.5 bg-[#00B900] text-white rounded-xl hover:bg-[#00a300] transition-all font-medium"
                >
                  <MessageCircle size={20} fill="white" />
                  <span>{t('lineLogin')}</span>
                </button>
              </div>
            </div>
            
            <div className="p-6 bg-gray-50 text-center text-xs text-gray-400">
              {t('terms')} | {t('privacy')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
