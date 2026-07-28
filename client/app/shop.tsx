import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, Alert, Linking,
  Dimensions, FlatList, RefreshControl, KeyboardAvoidingView, Platform,
  Image, Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { getColors } from '../src/theme/colors';
import { useUIStore } from '../src/store/uiStore';
import { useAuthStore } from '../src/store/authStore';
import { useShopListings, useMyListings, useCreateListing, useDeleteListing, useCreateBargain, useMarkAsSold, useChatWithSeller } from '../src/hooks/useShop';
import { ShopItem, ShopCategory } from '../src/types';
import { triggerHaptic } from '../src/utils/haptics';
import * as ImagePicker from 'expo-image-picker';
import { uploadToCloudinary } from '../src/utils/uploadToCloudinary';

const { width } = Dimensions.get('window');
const LIME = '#c8f53a';

const CATEGORIES: { id: ShopCategory | 'all'; label: string; icon: string }[] = [
  { id: 'all',         label: 'All',         icon: '✨' },
  { id: 'books',       label: 'Books',       icon: '📚' },
  { id: 'notes',       label: 'Notes',       icon: '📝' },
  { id: 'stationery',  label: 'Stationery',  icon: '📐' },
  { id: 'electronics', label: 'Electronics', icon: '💻' },
  { id: 'clothing',    label: 'Clothing',    icon: '👕' },
  { id: 'other',       label: 'Other',       icon: '📦' },
];

const CATEGORY_COLORS: Record<string, string> = {
  books:       '#3B82F6',
  notes:       '#8B5CF6',
  stationery:  '#F59E0B',
  electronics: '#10B981',
  clothing:    '#EC4899',
  other:       '#6B7280',
};

const LISTING_FEE = 5;
const BOOST_FEE   = 15;

export default function ShopScreen() {
  const router = useRouter();
  const isDark = useUIStore(s => s.isDark);
  const { user } = useAuthStore();
  const themeColors = getColors(isDark);

  const [activeCategory, setActiveCategory] = useState<ShopCategory | 'all'>('all');
  const [activeView, setActiveView] = useState<'browse' | 'mine'>('browse');

  // Browse listings
  const campus = user?.campus;
  const { data, isLoading, refetch, isRefetching } = useShopListings(
    campus,
    activeCategory === 'all' ? undefined : activeCategory
  );
  const { data: myListings, isLoading: myLoading, refetch: refetchMine } = useMyListings();

  // Mutations
  const { mutateAsync: createListing, isPending: creating } = useCreateListing();
  const { mutate: deleteListing } = useDeleteListing();
  const { mutate: markSold, isPending: markingSold } = useMarkAsSold();
  const { mutateAsync: chatWithSeller, isPending: openingChat } = useChatWithSeller();

  // Create listing modal state
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle,       setNewTitle]       = useState('');
  const [newDesc,        setNewDesc]        = useState('');
  const [newPrice,       setNewPrice]       = useState('');
  const [newContact,     setNewContact]     = useState('');
  const [newCategory,    setNewCategory]    = useState<ShopCategory>('books');
  const [wantFeatured,   setWantFeatured]   = useState(false);
  const [images,         setImages]         = useState<string[]>([]);
  const [isUploading,    setIsUploading]    = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Bargain state
  const { mutateAsync: createBargain, isPending: creatingBargain } = useCreateBargain();
  const [showBargain, setShowBargain] = useState(false);
  const [bargainPrice, setBargainPrice] = useState('');
  const [bargainMessage, setBargainMessage] = useState('');

  const pickImage = async () => {
    const remainingLimit = 5 - images.length;
    if (remainingLimit <= 0) {
      Alert.alert('Limit Reached', 'You can upload up to 5 photos.');
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: remainingLimit,
        quality: 0.7,
      });

      if (!result.canceled) {
        setIsUploading(true);
        for (const asset of result.assets) {
          const { url } = await uploadToCloudinary(asset.uri);
          setImages(prev => [...prev, url]);
        }
        setIsUploading(false);
      }
    } catch (err: any) {
      setIsUploading(false);
      Alert.alert('Upload Failed', err.message);
    }
  };

  // Item detail modal state
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);

  const resetForm = () => {
    setNewTitle(''); setNewDesc(''); setNewPrice('');
    setNewContact('');
    setNewCategory('books'); setWantFeatured(false);
    setImages([]);
  };

  const handleCreateListing = async () => {
    if (!newTitle.trim() || !newPrice) {
      Alert.alert('Missing Info', 'Please fill in item name and price.');
      return;
    }
    // Phone number validation (10 digits if provided)
    if (newContact.trim() && newContact.replace(/\D/g, '').length !== 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit WhatsApp/phone number.');
      return;
    }
    const priceNum = parseFloat(newPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      Alert.alert('Invalid Price', 'Enter a valid price in ₹.');
      return;
    }

    const potatoCost = wantFeatured ? 300 : 150;
    const currentPotato = user?.potato ?? 0;
    if (currentPotato < potatoCost) {
      Alert.alert(
        'Insufficient Potatoes',
        `You need ${potatoCost} 🥔 Potatoes to list this item. You have ${currentPotato} 🥔.\n\nEarn more potatoes by posting and getting upvotes!`
      );
      return;
    }

    Alert.alert(
      'Confirm Listing',
      `Use ${potatoCost} 🥔 Potatoes to list this item?\n\nBuyers will contact you on campus to exchange.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `List for ${potatoCost} 🥔`,
          onPress: async () => {
            try {
              setShowCreate(false);
              await createListing({
                title: newTitle.trim(),
                description: newDesc.trim(),
                price: priceNum,
                category: newCategory,
                sellerUpi: '',
                sellerContact: newContact.trim(),
                wantFeatured,
                paymentMethod: 'potato',
                image: images[0] || undefined,
                images: images,
              });
              resetForm();
              Alert.alert('🎉 Listed!', 'Your item is now live on the campus shop.');
            } catch (e) {
              // errors handled in hook
            }
          },
        },
      ]
    );
  };

  const handleDeleteListing = (item: ShopItem) => {
    Alert.alert('Delete Listing', `Remove "${item.title}" from shop?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          triggerHaptic('impact');
          deleteListing(item._id);
        },
      },
    ]);
  };

  const handleMarkSold = (item: ShopItem) => {
    Alert.alert(
      'Mark as Sold',
      `Mark "${item.title}" as sold? It will be removed from the browse feed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '✅ Mark Sold',
          onPress: () => { triggerHaptic('impact'); markSold(item._id); },
        },
      ]
    );
  };

  // Contact seller — WhatsApp only
  const handleContactSeller = (item: ShopItem) => {
    const hasContact = !!item.sellerContact?.trim();

    if (!hasContact) {
      Alert.alert('No Contact Info', 'This seller has no WhatsApp number. Try sending them an in-app message.');
      return;
    }

    const phone = item.sellerContact.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/91${phone}?text=Hi! I'm interested in your listing on Loona: "${item.title}" (₹${item.price}). Is it still available? Let's meet on campus 🙏`);
  };

  // GAP 3 fix — in-app chat with seller
  const handleMessageSeller = async (item: ShopItem) => {
    try {
      const { chatId } = await chatWithSeller(item._id);
      setSelectedItem(null);
      setTimeout(() => router.push(`/chat/${chatId}`), 300);
    } catch (_) {}
  };

  // ─── Render item card ────────────────────────────────────────────────────
  const renderItem = useCallback(({ item }: { item: ShopItem }) => {
    const catColor = CATEGORY_COLORS[item.category] || '#888';
    const catInfo = CATEGORIES.find(c => c.id === item.category);
    const isMine = item.seller?._id === user?._id;

    return (
      <TouchableOpacity
        style={[
          s.itemCard,
          {
            backgroundColor: themeColors.card,
            borderColor: item.isFeatured ? LIME + '55' : themeColors.bdr,
            borderWidth: item.isFeatured ? 1.5 : 1,
          },
        ]}
        activeOpacity={0.85}
        onPress={() => setSelectedItem(item)}
      >
        {/* Featured badge */}
        {item.isFeatured && (
          <View style={s.featuredBadge}>
            <Text style={s.featuredTxt}>⭐ Featured</Text>
          </View>
        )}

        {/* Category pill */}
        <View style={[s.catPill, { backgroundColor: catColor + '20' }]}>
          <Text style={{ fontSize: 10, color: catColor, fontWeight: '800' }}>
            {catInfo?.icon} {catInfo?.label?.toUpperCase()}
          </Text>
        </View>

        {!!item.image && (
          <Image source={{ uri: item.image }} style={[s.itemImage, { backgroundColor: '#111' }]} resizeMode="contain" />
        )}

        <Text style={[s.itemTitle, { color: themeColors.txt }]} numberOfLines={2}>
          {item.title}
        </Text>

        {!!item.description && (
          <Text style={[s.itemDesc, { color: themeColors.txt3 }]} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={s.itemFooter}>
          <Text style={[s.itemPrice, { color: LIME }]}>₹{item.price}</Text>
          <View style={s.sellerRow}>
            <Text style={{ fontSize: 16 }}>{item.seller?.avatar || '👤'}</Text>
            <Text style={[s.sellerName, { color: themeColors.txt3 }]} numberOfLines={1}>
              {isMine ? 'You' : item.seller?.name}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [themeColors, user]);

  // ─── My listing card ─────────────────────────────────────────────────────
  const renderMyItem = ({ item }: { item: ShopItem }) => {
    const catColor = CATEGORY_COLORS[item.category] || '#888';
    const catInfo = CATEGORIES.find(c => c.id === item.category);
    const statusColor = item.status === 'available' ? '#34C759' : item.status === 'sold' ? '#FF3B30' : '#FF9500';
    const statusLabel = item.status === 'available' ? 'Live' : item.status === 'sold' ? 'Sold' : 'Pending';

    return (
      <View style={[s.myCard, { backgroundColor: themeColors.card, borderColor: themeColors.bdr }]}>
        {!!item.image && (
          <Image source={{ uri: item.image }} style={s.myImage} resizeMode="cover" />
        )}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <View style={[s.catPill, { backgroundColor: catColor + '20' }]}>
              <Text style={{ fontSize: 10, color: catColor, fontWeight: '800' }}>
                {catInfo?.icon} {catInfo?.label?.toUpperCase()}
              </Text>
            </View>
            {item.isFeatured && (
              <View style={[s.catPill, { backgroundColor: LIME + '20' }]}>
                <Text style={{ fontSize: 10, color: '#6b8c00', fontWeight: '800' }}>⭐ FEATURED</Text>
              </View>
            )}
            <View style={[s.statusPill, { backgroundColor: statusColor + '20' }]}>
              <View style={[s.statusDot, { backgroundColor: statusColor }]} />
              <Text style={{ fontSize: 10, color: statusColor, fontWeight: '800' }}>{statusLabel}</Text>
            </View>
          </View>
          <Text style={[s.itemTitle, { color: themeColors.txt }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[s.itemPrice, { color: LIME, fontSize: 16, marginTop: 4 }]}>₹{item.price}</Text>
        </View>
        {item.status !== 'sold' && (
          <View style={{ flexDirection: 'column', gap: 8 }}>
            {/* Mark as Sold */}
            <TouchableOpacity
              style={[s.deleteBtn, { backgroundColor: '#34C75915' }]}
              onPress={() => handleMarkSold(item)}
              disabled={markingSold}
            >
              {markingSold
                ? <ActivityIndicator size="small" color="#34C759" />
                : <Ionicons name="checkmark-circle-outline" size={18} color="#34C759" />
              }
            </TouchableOpacity>
            {/* Delete */}
            <TouchableOpacity
              style={[s.deleteBtn, { backgroundColor: '#FF3B3015' }]}
              onPress={() => handleDeleteListing(item)}
            >
              <Ionicons name="trash-outline" size={18} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const listings = data?.items ?? [];
  const mine = myListings ?? [];

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: isDark ? '#0a0a0f' : themeColors.bg }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={26} color={themeColors.txt} />
        </TouchableOpacity>
        <View>
          <Text style={[s.headerTitle, { color: themeColors.txt }]}>Campus Shop</Text>
          <Text style={[s.headerSub, { color: themeColors.txt3 }]}>Buy & sell within campus</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity
            style={[s.sellBtn, { backgroundColor: themeColors.card2 }]}
            onPress={() => router.push('/bargains')}
          >
            <Ionicons name="swap-horizontal" size={20} color={themeColors.txt} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.sellBtn, { backgroundColor: LIME }]}
            onPress={() => { triggerHaptic(); setShowCreate(true); }}
          >
            <Ionicons name="add" size={20} color="#000" />
            <Text style={s.sellBtnTxt}>Sell</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Toggle Browse / My Listings */}
      <View style={[s.toggleRow, { backgroundColor: themeColors.card2 }]}>
        <TouchableOpacity
          style={[s.toggleBtn, activeView === 'browse' && { backgroundColor: themeColors.bg }]}
          onPress={() => setActiveView('browse')}
        >
          <Text style={[s.toggleTxt, { color: activeView === 'browse' ? themeColors.txt : themeColors.txt3 }]}>Browse</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.toggleBtn, activeView === 'mine' && { backgroundColor: themeColors.bg }]}
          onPress={() => { setActiveView('mine'); refetchMine(); }}
        >
          <Text style={[s.toggleTxt, { color: activeView === 'mine' ? themeColors.txt : themeColors.txt3 }]}>My Listings</Text>
        </TouchableOpacity>
      </View>

      {activeView === 'browse' ? (
        <>
          {/* Category filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.catScroll}
            style={s.catScrollWrapper}
          >
            {CATEGORIES.map(cat => {
              const isActive = activeCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    s.catBtn,
                    {
                      backgroundColor: isActive ? LIME : themeColors.card2,
                      borderColor: isActive ? LIME : themeColors.bdr,
                    },
                  ]}
                  onPress={() => { triggerHaptic('selection'); setActiveCategory(cat.id as any); }}
                >
                  <Text style={[s.catBtnTxt, { color: isActive ? '#000' : themeColors.txt2 }]}>
                    {cat.icon} {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Listings grid */}
          {isLoading ? (
            <ActivityIndicator color={LIME} style={{ marginTop: 40 }} />
          ) : listings.length === 0 ? (
            <View style={s.empty}>
              <Text style={{ fontSize: 48 }}>🛍️</Text>
              <Text style={[s.emptyTxt, { color: themeColors.txt3 }]}>No items listed yet</Text>
              <Text style={[s.emptySubTxt, { color: themeColors.txt3 }]}>Be the first to sell something!</Text>
              <TouchableOpacity
                style={[s.emptyAction, { backgroundColor: LIME }]}
                onPress={() => setShowCreate(true)}
              >
                <Text style={{ fontWeight: '800', color: '#000', fontSize: 14 }}>+ Sell an Item</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={listings}
              keyExtractor={i => i._id}
              renderItem={renderItem}
              numColumns={2}
              columnWrapperStyle={{ gap: 12 }}
              contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={LIME} />
              }
            />
          )}
        </>
      ) : (
        /* My Listings */
        myLoading ? (
          <ActivityIndicator color={LIME} style={{ marginTop: 40 }} />
        ) : mine.length === 0 ? (
          <View style={s.empty}>
            <Text style={{ fontSize: 48 }}>📦</Text>
            <Text style={[s.emptyTxt, { color: themeColors.txt3 }]}>You haven't listed anything yet</Text>
            <TouchableOpacity
              style={[s.emptyAction, { backgroundColor: LIME }]}
              onPress={() => setShowCreate(true)}
            >
              <Text style={{ fontWeight: '800', color: '#000', fontSize: 14 }}>+ Start Selling</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={mine}
            keyExtractor={i => i._id}
            renderItem={renderMyItem}
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={myLoading} onRefresh={refetchMine} tintColor={LIME} />
            }
          />
        )
      )}

      {/* ── Item Detail Bottom Sheet ──────────────────────────────── */}
      <Modal
        visible={!!selectedItem}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedItem(null)}
      >
        <View style={s.modalOverlay}>
          <View style={[s.detailSheet, { backgroundColor: themeColors.bg }]}>
            {selectedItem && (() => {
              const catColor = CATEGORY_COLORS[selectedItem.category] || '#888';
              const catInfo = CATEGORIES.find(c => c.id === selectedItem.category);
              const isMine = selectedItem.seller?._id === user?._id;
              return (
                <>
                  <View style={s.sheetHandle} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <View style={[s.catPill, { backgroundColor: catColor + '20' }]}>
                      <Text style={{ fontSize: 12, color: catColor, fontWeight: '800' }}>
                        {catInfo?.icon} {catInfo?.label?.toUpperCase()}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedItem(null)} style={s.closeX}>
                      <Ionicons name="close" size={22} color={themeColors.txt} />
                    </TouchableOpacity>
                  </View>

                  {selectedItem.images && selectedItem.images.length > 1 ? (
                    <View style={{ width: '100%', height: 180, borderRadius: 16, marginBottom: 16, overflow: 'hidden', backgroundColor: '#111', position: 'relative' }}>
                      <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onScroll={(e) => {
                          const slide = Math.round(e.nativeEvent.contentOffset.x / (width - 48));
                          setActiveImageIndex(slide);
                        }}
                        scrollEventThrottle={16}
                      >
                        {selectedItem.images.map((img, index) => (
                          <Image
                            key={index}
                            source={{ uri: img }}
                            style={{ width: width - 48, height: 180 }}
                            resizeMode="contain"
                          />
                        ))}
                      </ScrollView>
                      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, position: 'absolute', bottom: 12, left: 0, right: 0 }}>
                        {selectedItem.images.map((_, index) => (
                          <View
                            key={index}
                            style={{
                              width: activeImageIndex === index ? 8 : 6,
                              height: activeImageIndex === index ? 8 : 6,
                              borderRadius: 4,
                              backgroundColor: activeImageIndex === index ? themeColors.ogi : 'rgba(255,255,255,0.4)',
                            }}
                          />
                        ))}
                      </View>
                    </View>
                  ) : (
                    !!selectedItem.image && (
                      <Image 
                        source={{ uri: selectedItem.image }} 
                        style={[s.detailImage, { backgroundColor: '#111' }]} 
                        resizeMode="contain" 
                      />
                    )
                  )}

                  <Text style={[s.detailTitle, { color: themeColors.txt }]}>{selectedItem.title}</Text>

                  {!!selectedItem.description && (
                    <Text style={[s.detailDesc, { color: themeColors.txt2 }]}>{selectedItem.description}</Text>
                  )}

                  <View style={[s.priceRow, { backgroundColor: themeColors.card2 }]}>
                    <View>
                      <Text style={{ color: themeColors.txt3, fontSize: 11, fontWeight: '700' }}>PRICE</Text>
                      <Text style={[s.detailPrice, { color: LIME }]}>₹{selectedItem.price}</Text>
                    </View>
                    {selectedItem.isFeatured && (
                      <View style={[s.featuredBadge, { position: 'relative', bottom: 0, left: 0 }]}>
                        <Text style={s.featuredTxt}>⭐ Featured</Text>
                      </View>
                    )}
                  </View>

                  <View style={[s.sellerCard, { backgroundColor: themeColors.card }]}>
                    <Text style={{ fontSize: 32 }}>{selectedItem.seller?.avatar || '👤'}</Text>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[s.sellerCardName, { color: themeColors.txt }]}>
                        {isMine ? 'Your listing' : selectedItem.seller?.name}
                      </Text>
                      <Text style={{ color: themeColors.txt3, fontSize: 12 }}>
                        {selectedItem.campus?.toUpperCase()} Campus
                      </Text>
                    </View>
                  </View>

                  {isMine && (
                    <TouchableOpacity
                      style={[s.buyBtn, { backgroundColor: '#FF3B3015', borderWidth: 1, borderColor: '#FF3B30' }]}
                      onPress={() => {
                        setSelectedItem(null);
                        setTimeout(() => handleDeleteListing(selectedItem), 400);
                      }}
                    >
                      <Text style={[s.buyBtnTxt, { color: '#FF3B30' }]}>🗑️ Delete Listing</Text>
                    </TouchableOpacity>
                  )}

                  {!isMine && (
                    <View style={{ gap: 12 }}>
                      {/* Primary: WhatsApp Contact */}
                      {!!selectedItem.sellerContact && (
                        <TouchableOpacity
                          style={[s.buyBtn, { backgroundColor: '#25D366' }]}
                          onPress={() => {
                            setSelectedItem(null);
                            setTimeout(() => handleContactSeller(selectedItem), 400);
                          }}
                        >
                          <Text style={[s.buyBtnTxt, { color: '#FFF' }]}>💬 Contact on WhatsApp</Text>
                        </TouchableOpacity>
                      )}

                      {/* In-app message — always available */}
                      <TouchableOpacity
                        style={[s.buyBtn, { backgroundColor: themeColors.card2, borderWidth: 1, borderColor: LIME }]}
                        onPress={() => handleMessageSeller(selectedItem)}
                        disabled={openingChat}
                      >
                        {openingChat
                          ? <ActivityIndicator color={LIME} />
                          : <Text style={[s.buyBtnTxt, { color: LIME }]}>💬 Message Seller In-App</Text>
                        }
                      </TouchableOpacity>

                      {/* Bargain offer */}
                      <TouchableOpacity
                        style={[s.buyBtn, { backgroundColor: themeColors.card2, borderWidth: 1, borderColor: themeColors.bdr }]}
                        onPress={() => {
                          setBargainPrice(selectedItem.price.toString());
                          setShowBargain(true);
                        }}
                      >
                        <Text style={[s.buyBtnTxt, { color: themeColors.txt2 }]}>🤝 Make an Offer / Bargain</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <Text style={[s.payNote, { color: themeColors.txt3 }]}>
                    🏫 Meet on campus to exchange. No digital payment needed.
                  </Text>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ── Create Listing Bottom Sheet ───────────────────────────── */}
      <Modal
        visible={showCreate}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreate(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={s.modalOverlay}>
            <View style={[s.createSheet, { backgroundColor: themeColors.bg }]}>
              <View style={s.sheetHandle} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={[s.sheetTitle, { color: themeColors.txt }]}>List an Item</Text>
                <TouchableOpacity onPress={() => setShowCreate(false)} style={s.closeX}>
                  <Ionicons name="close" size={22} color={themeColors.txt} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Product Image Selection */}
                {/* Product Image Selection */}
                <View style={{ marginBottom: 12 }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                    <TouchableOpacity 
                      onPress={pickImage} 
                      style={[s.imagePickerBox, { width: 100, height: 100, marginBottom: 0, backgroundColor: themeColors.card2, borderColor: themeColors.bdr }]}
                    >
                      <View style={{ alignItems: 'center', justifyContent: 'center', height: '100%', paddingHorizontal: 4 }}>
                        <Ionicons name="camera-outline" size={24} color={themeColors.txt3} />
                        <Text style={{ color: themeColors.txt3, fontSize: 10, fontWeight: '700', marginTop: 4, textAlign: 'center' }}>Add Photo</Text>
                      </View>
                    </TouchableOpacity>
                    {images.map((uri, idx) => (
                      <View key={idx} style={{ width: 100, height: 100, borderRadius: 14, overflow: 'hidden', position: 'relative' }}>
                        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        <TouchableOpacity 
                          style={s.removeImageBtn} 
                          onPress={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                        >
                          <Ionicons name="close" size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {isUploading && (
                      <View style={{ width: 100, height: 100, borderRadius: 14, backgroundColor: themeColors.card2, alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator color={LIME} />
                      </View>
                    )}
                  </ScrollView>
                </View>

                <Text style={s.inputLabel}>ITEM NAME *</Text>
                <TextInput
                  style={[s.input, { backgroundColor: themeColors.card2, color: themeColors.txt }]}
                  placeholder="e.g., Engineering Mathematics textbook"
                  placeholderTextColor={themeColors.txt3}
                  value={newTitle}
                  onChangeText={setNewTitle}
                  maxLength={80}
                />

                <Text style={s.inputLabel}>DESCRIPTION</Text>
                <TextInput
                  style={[s.input, s.textArea, { backgroundColor: themeColors.card2, color: themeColors.txt }]}
                  placeholder="Condition, edition, reason for selling..."
                  placeholderTextColor={themeColors.txt3}
                  value={newDesc}
                  onChangeText={setNewDesc}
                  maxLength={500}
                  multiline
                />

                <Text style={s.inputLabel}>PRICE (₹) *</Text>
                <TextInput
                  style={[s.input, { backgroundColor: themeColors.card2, color: themeColors.txt }]}
                  placeholder="e.g., 150"
                  placeholderTextColor={themeColors.txt3}
                  value={newPrice}
                  onChangeText={setNewPrice}
                  keyboardType="numeric"
                />

                <Text style={s.inputLabel}>WHATSAPP / PHONE (optional)</Text>
                <TextInput
                  style={[s.input, { backgroundColor: themeColors.card2, color: themeColors.txt }]}
                  placeholder="e.g., 9876543210 (buyers will contact you here)"
                  placeholderTextColor={themeColors.txt3}
                  value={newContact}
                  onChangeText={setNewContact}
                  keyboardType="phone-pad"
                />

                <Text style={s.inputLabel}>CATEGORY *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          s.catBtn,
                          {
                            backgroundColor: newCategory === cat.id ? LIME : themeColors.card2,
                            borderColor: newCategory === cat.id ? LIME : themeColors.bdr,
                          },
                        ]}
                        onPress={() => setNewCategory(cat.id as ShopCategory)}
                      >
                        <Text style={{ color: newCategory === cat.id ? '#000' : themeColors.txt2, fontWeight: '700', fontSize: 13 }}>
                          {cat.icon} {cat.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                {/* Featured boost toggle */}
                <TouchableOpacity
                  style={[
                    s.boostToggle,
                    {
                      backgroundColor: wantFeatured ? LIME + '15' : themeColors.card2,
                      borderColor: wantFeatured ? LIME : themeColors.bdr,
                      borderWidth: 1,
                      marginTop: 8,
                      gap: 12
                    },
                  ]}
                  onPress={() => { triggerHaptic('selection'); setWantFeatured(v => !v); }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: themeColors.txt, fontWeight: '800', fontSize: 14 }}>
                      ⭐ Featured Boost (+150 🥔)
                    </Text>
                    <Text style={{ color: themeColors.txt3, fontSize: 12, marginTop: 2 }}>
                      Your item appears at the top of all listings
                    </Text>
                  </View>
                  <View style={[s.toggleCircle, { backgroundColor: wantFeatured ? LIME : themeColors.bdr }]}>
                    {wantFeatured && <Ionicons name="checkmark" size={14} color="#000" />}
                  </View>
                </TouchableOpacity>

                {/* Fee summary */}
                <View style={[s.feeSummary, { backgroundColor: themeColors.card2 }]}>
                  <Ionicons name="information-circle-outline" size={16} color={themeColors.txt3} />
                  <Text style={{ color: themeColors.txt3, fontSize: 12, flex: 1, marginLeft: 8 }}>
                    Listing fee: 150 🥔{wantFeatured ? ' + 150 🥔 boost = 300 🥔 total' : ''}
                    {'\n'}Your potato balance: {user?.potato ?? 0} 🥔
                  </Text>
                </View>

                <TouchableOpacity
                  style={[s.submitBtn, { backgroundColor: LIME }, creating && { opacity: 0.6 }]}
                  onPress={handleCreateListing}
                  disabled={creating}
                >
                  {creating ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={s.submitTxt}>
                      List Item for {wantFeatured ? '300' : '150'} 🥔
                    </Text>
                  )}
                </TouchableOpacity>

                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Bargain Bottom Sheet ───────────────────────────── */}
      <Modal
        visible={showBargain}
        animationType="slide"
        transparent
        onRequestClose={() => setShowBargain(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={s.modalOverlay}>
            <View style={[s.createSheet, { backgroundColor: themeColors.bg, height: '70%' }]}>
              <View style={s.sheetHandle} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={[s.sheetTitle, { color: themeColors.txt }]}>Make an Offer</Text>
                <TouchableOpacity onPress={() => setShowBargain(false)} style={s.closeX}>
                  <Ionicons name="close" size={22} color={themeColors.txt} />
                </TouchableOpacity>
              </View>
              
              <Text style={s.inputLabel}>YOUR PRICE (₹) *</Text>
              <TextInput
                style={[s.input, { backgroundColor: themeColors.card2, color: themeColors.txt }]}
                placeholder="e.g., 100"
                placeholderTextColor={themeColors.txt3}
                value={bargainPrice}
                onChangeText={setBargainPrice}
                keyboardType="numeric"
              />
              
              <Text style={s.inputLabel}>MESSAGE (optional)</Text>
              <TextInput
                style={[s.input, s.textArea, { backgroundColor: themeColors.card2, color: themeColors.txt }]}
                placeholder="e.g., Let's chat and meet in canteen."
                placeholderTextColor={themeColors.txt3}
                value={bargainMessage}
                onChangeText={setBargainMessage}
                multiline
              />
              
              <TouchableOpacity
                style={[s.submitBtn, { backgroundColor: LIME, marginTop: 24 }, creatingBargain && { opacity: 0.6 }]}
                onPress={async () => {
                   const num = parseFloat(bargainPrice);
                   if(isNaN(num) || num <= 0) return Alert.alert('Invalid price');
                   try {
                     await createBargain({ itemId: selectedItem!._id, price: num, message: bargainMessage.trim() });
                     setShowBargain(false);
                   } catch(e) {}
                }}
                disabled={creatingBargain}
              >
                {creatingBargain ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={s.submitTxt}>Send Offer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  headerSub: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  sellBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  sellBtnTxt: { fontWeight: '900', color: '#000', fontSize: 14 },

  toggleRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, borderRadius: 14, padding: 4 },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 12 },
  toggleTxt: { fontWeight: '700', fontSize: 14 },

  catScrollWrapper: { flexGrow: 0, height: 38, marginBottom: 12 },
  catScroll: { paddingHorizontal: 16, gap: 6 },
  catBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  catBtnTxt: { fontWeight: '700', fontSize: 12 },

  itemCard: {
    flex: 1, borderRadius: 20, padding: 14, overflow: 'hidden',
  },
  featuredBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: LIME + '25', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  featuredTxt: { fontSize: 10, fontWeight: '800', color: '#6b8c00' },
  catPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8 },
  itemTitle: { fontSize: 14, fontWeight: '800', marginBottom: 4, lineHeight: 20 },
  itemDesc: { fontSize: 12, lineHeight: 16, marginBottom: 8 },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  itemPrice: { fontSize: 18, fontWeight: '900' },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 80 },
  sellerName: { fontSize: 11, fontWeight: '600' },

  myCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 18, borderWidth: 1,
  },
  deleteBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  emptyTxt: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptySubTxt: { fontSize: 13, textAlign: 'center' },
  emptyAction: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, marginTop: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 16 },
  closeX: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },

  detailSheet: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 40 },
  detailTitle: { fontSize: 22, fontWeight: '900', marginBottom: 8 },
  detailDesc: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  priceRow: { borderRadius: 16, padding: 16, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailPrice: { fontSize: 32, fontWeight: '900' },
  sellerCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, marginBottom: 20 },
  sellerCardName: { fontSize: 16, fontWeight: '700' },
  buyBtn: { paddingVertical: 16, borderRadius: 20, alignItems: 'center', marginBottom: 12 },
  buyBtnTxt: { fontWeight: '900', fontSize: 16, color: '#000' },
  payNote: { fontSize: 11, textAlign: 'center', opacity: 0.7 },

  createSheet: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, maxHeight: '90%' },
  sheetTitle: { fontSize: 20, fontWeight: '900' },
  inputLabel: { fontSize: 10, fontWeight: '800', color: '#888', marginBottom: 6, letterSpacing: 1, marginTop: 14 },
  input: { borderRadius: 14, padding: 14, fontSize: 14, minHeight: 48 },
  textArea: { height: 90, textAlignVertical: 'top' },
  boostToggle: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, marginTop: 8, gap: 12 },
  toggleCircle: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  feeSummary: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderRadius: 12, marginTop: 14, gap: 8 },
  submitBtn: { paddingVertical: 16, borderRadius: 20, alignItems: 'center', marginTop: 20 },
  submitTxt: { fontWeight: '900', fontSize: 16, color: '#000' },
  itemImage: { width: '100%', height: 110, borderRadius: 12, marginBottom: 8 },
  myImage: { width: 50, height: 50, borderRadius: 8, marginRight: 12 },
  detailImage: { width: '100%', height: 180, borderRadius: 16, marginBottom: 16 },
  imagePickerBox: { height: 140, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 12, overflow: 'hidden' },
  removeImageBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
});
