import {Suspense, lazy, useCallback, useEffect, useState} from 'react';
import EditPublishAdScreen from './EditPublishAdScreen';
import AdsForm from './AdsForm';
import PublishSuccessToast from './components/PublishSuccessToast';
import {updateListingFreeze} from '../api/editPublish';
import {resolveSubscriptionId} from '../api/listingsPublish';
import {useSession} from '../auth/session';
import {
  DEFAULT_POST_DESCRIPTION,
  OPEN_HOUSE_POST_DESCRIPTION,
  OPEN_HOUSE_POST_KIND,
  canAccessListingAnalysis,
  isOpenHouseListing,
} from './lib/publishRules';

const PostEditorScreen = lazy(() => import('./PostEditorScreen'));
const ListingAnalysisScreen = lazy(() => import('./ListingAnalysisScreen'));

const EMPTY_POST_EDITOR = {
  publishTarget: 'post',
  returnScreen: 'editPublish',
  listingCategoryId: null,
  editingListing: null,
  skipStoryPublish: false,
  salesImageAlreadyMirrored: false,
  postDescriptionLabel: DEFAULT_POST_DESCRIPTION,
};

const toCategoryId = raw => {
  const n = raw != null && String(raw).trim() !== '' ? parseInt(String(raw).trim(), 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};

const screenFallback = <div style={{position: 'absolute', inset: 0, background: '#1e1d2b'}} />;

/**
 * ערוך/פרסם → AdsForm / PostEditor / ניתוח מודעות, wired like mobile App.js
 * (`screenName.editPublishAd`, `adsForm`, `postEditor`, `listingAnalysis`).
 * `start` = {screen: 'editPublish'} or {screen: 'adsForm', category, bnbHostType}.
 */
export default function PublishFlow({start, onExit, onHome, onMenu}) {
  const {currentUser: sessionUser} = useSession();
  const currentUser = start?.actorUser || sessionUser;
  const [screen, setScreen] = useState(start?.screen || 'editPublish');
  const [selectedCategory, setSelectedCategory] = useState(start?.category != null ? String(start.category) : null);
  const [editingListing, setEditingListing] = useState(start?.editingListing ?? null);
  const [bnbPublishHostType, setBnbPublishHostType] = useState(start?.bnbHostType ?? null);
  const [editPublishSourceCategory, setEditPublishSourceCategory] = useState(
    start?.screen === 'editPublish' ? toCategoryId(start?.category) : null,
  );
  const [uploadedListings, setUploadedListings] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [adsFormKey, setAdsFormKey] = useState(0);
  const [postEditorConfig, setPostEditorConfig] = useState(() =>
    start?.screen === 'postEditor'
      ? {
          ...EMPTY_POST_EDITOR,
          returnScreen: 'exit',
          editingListing: start.editingListing ?? null,
          listingCategoryId: toCategoryId(start?.category),
          postDescriptionLabel: start?.openHouse ? OPEN_HOUSE_POST_DESCRIPTION : DEFAULT_POST_DESCRIPTION,
        }
      : EMPTY_POST_EDITOR,
  );
  const [postEditorKey, setPostEditorKey] = useState(0);
  const [adsFormPendingSalesImage, setAdsFormPendingSalesImage] = useState(null);
  const [toast, setToast] = useState({visible: false, message: 'המודעה שלכם פורסמה בהצלחה!'});
  const adsFormReturn = start?.screen === 'adsForm' ? 'exit' : 'editPublish';

  useEffect(() => {
    if (screen !== 'editPublish') return undefined;
    const onKey = e => {
      if (e.key !== 'Escape' || document.querySelector('[data-account-modal]')) return;
      e.stopPropagation();
      onExit('back');
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [screen, onExit]);

  const goTo = useCallback(
    target => {
      if (target === 'exit') onExit('back');
      else setScreen(target);
    },
    [onExit],
  );

  const openAdsForm = useCallback(({category, listing = null, bnbHostType = null}) => {
    if (category != null) setSelectedCategory(String(category));
    setEditingListing(listing);
    setBnbPublishHostType(listing ? null : bnbHostType);
    setAdsFormPendingSalesImage(null);
    setAdsFormKey(k => k + 1);
    setScreen('adsForm');
  }, []);

  const openPostEditor = useCallback(config => {
    setPostEditorConfig({...EMPTY_POST_EDITOR, ...config});
    setPostEditorKey(k => k + 1);
    setScreen('postEditor');
  }, []);

  const leaveAdsForm = useCallback(() => {
    setBnbPublishHostType(null);
    setEditingListing(null);
    goTo(adsFormReturn);
  }, [adsFormReturn, goTo]);

  const finishPublishedListing = useCallback(
    ({returnScreen, categoryId, listingPreview, isUpdate = false}) => {
      const resolvedCat = toCategoryId(categoryId);
      if (resolvedCat != null) setSelectedCategory(String(resolvedCat));
      if (returnScreen === 'editPublish' && resolvedCat != null) setEditPublishSourceCategory(resolvedCat);
      if (listingPreview) setUploadedListings(prev => [...prev, listingPreview]);
      setEditingListing(null);
      setBnbPublishHostType(null);
      setPostEditorConfig(prev => ({...prev, editingListing: null}));
      setRefreshKey(k => k + 1);
      goTo(returnScreen);
      setToast({visible: true, message: isUpdate ? 'המודעה שלך עודכנה בהצלחה' : 'המודעה שלכם פורסמה בהצלחה!'});
    },
    [goTo],
  );

  const handleAdPublish = useCallback(
    listingData => {
      const images = [];
      if (listingData?.mainImage) images.push(listingData.mainImage);
      if (listingData?.additionalImages?.length) images.push(...listingData.additionalImages);
      finishPublishedListing({
        returnScreen: adsFormReturn,
        categoryId: listingData?.category,
        isUpdate: listingData?.isUpdate === true,
        listingPreview: {
          id: listingData?.id,
          category: listingData?.category,
          images,
          price: listingData?.price ?? listingData?.budget,
          subscription_id: currentUser?.id,
          email: currentUser?.email,
        },
      });
    },
    [adsFormReturn, currentUser?.email, currentUser?.id, finishPublishedListing],
  );

  const handleOpenPostEditorFromAdsForm = useCallback(
    async arg => {
      const isObj = typeof arg === 'object' && arg != null;
      const listingCat = toCategoryId(isObj ? arg.categoryId : arg);
      const salesImageUrl = isObj ? arg.salesImageUrl : null;
      const adListing = isObj ? arg.adListing : null;
      const trimmedSales =
        salesImageUrl != null && String(salesImageUrl).trim() !== '' ? String(salesImageUrl).trim() : null;

      let resolvedEditingListing = null;
      if (trimmedSales) {
        try {
          const {resolveSalesImageEditorListing} = await import('./lib/postTextOverlayEditor');
          resolvedEditingListing = await resolveSalesImageEditorListing({
            salesImageUrl: trimmedSales,
            subscriptionId: resolveSubscriptionId(currentUser),
            editorMeta: isObj ? arg.salesImageEditorMeta : null,
            adGeneralDetails: adListing?.general_details ?? null,
          });
        } catch {
          resolvedEditingListing = null;
        }
      }

      openPostEditor({
        publishTarget: 'story',
        returnScreen: 'adsForm',
        listingCategoryId: listingCat,
        // Story upload is deferred to the ad's Publish so it carries the final sales image.
        skipStoryPublish: true,
        editingListing: resolvedEditingListing,
        salesImageAlreadyMirrored: Boolean(
          adListing?.id && String(adListing.sales_image_url || adListing.salesImageUrl || '').trim(),
        ),
        postDescriptionLabel: DEFAULT_POST_DESCRIPTION,
      });
      if (listingCat != null) setSelectedCategory(String(listingCat));
    },
    [currentUser, openPostEditor],
  );

  const handlePostPublish = useCallback(
    payload => {
      const {returnScreen, publishTarget, postDescriptionLabel} = postEditorConfig;

      if (returnScreen === 'adsForm' && payload?.url && publishTarget === 'story') {
        // Companions already exist for this ad — the ad's Publish updates them in place.
        const hadExistingSales =
          postEditorConfig.salesImageAlreadyMirrored === true ||
          String(editingListing?.sales_image_url || editingListing?.salesImageUrl || '').trim() !== '';
        setAdsFormPendingSalesImage({
          url: payload.url,
          storyAlreadyCreated: hadExistingSales,
          feedPostAlreadyCreated: hadExistingSales,
          generalDetails: payload.generalDetails || null,
          sourceImageUrl: payload.sourceImageUrl || null,
        });
        setScreen('adsForm');
        return;
      }

      const categoryRaw = payload?.category ?? postEditorConfig.listingCategoryId;
      const categoryId = toCategoryId(categoryRaw);

      let listingPreview = null;
      if (returnScreen === 'editPublish' && payload?.url && publishTarget === 'post' && !payload?.isEdit) {
        const description = postDescriptionLabel || DEFAULT_POST_DESCRIPTION;
        listingPreview = {
          id: payload.id,
          category: categoryId ?? categoryRaw,
          video_url: payload.isVideo ? payload.url : null,
          images: payload.isVideo ? [] : [payload.url],
          image: payload.isVideo ? null : payload.url,
          description,
          feed_post: true,
          property_type: 'post',
          subscription_id: currentUser?.id,
          email: currentUser?.email,
          general_details:
            postDescriptionLabel === OPEN_HOUSE_POST_DESCRIPTION
              ? {
                  post_kind: OPEN_HOUSE_POST_KIND,
                  ...(payload?.generalDetails && typeof payload.generalDetails === 'object'
                    ? payload.generalDetails
                    : {}),
                }
              : payload?.generalDetails || null,
        };
      }

      finishPublishedListing({returnScreen, categoryId, listingPreview});
    },
    [currentUser?.email, currentUser?.id, editingListing, finishPublishedListing, postEditorConfig],
  );

  const closePostEditor = useCallback(() => {
    const back = postEditorConfig.returnScreen;
    setPostEditorConfig(prev => ({
      ...prev,
      editingListing: null,
      skipStoryPublish: false,
      salesImageAlreadyMirrored: false,
    }));
    goTo(back);
  }, [goTo, postEditorConfig.returnScreen]);

  // The page that opened the editor stays mounted underneath the phone popup,
  // so the dimmed background is ערוך/פרסם or the ad form — not the home screen.
  const editorOverEditPublish = screen === 'postEditor' && postEditorConfig.returnScreen === 'editPublish';
  const editorOverAdsForm = screen === 'postEditor' && postEditorConfig.returnScreen === 'adsForm';
  const adsFormMounted = screen === 'adsForm' || editorOverAdsForm;

  return (
    <>
      {screen === 'editPublish' || editorOverEditPublish ? (
        <div inert={editorOverEditPublish ? true : undefined} style={{display: 'contents'}}>
        <EditPublishAdScreen
          refreshKey={refreshKey}
          currentUser={currentUser}
          uploadedListings={uploadedListings}
          initialCategoryId={editPublishSourceCategory}
          onClose={() => onExit('back')}
          onHome={onHome}
          onMenu={onMenu}
          onCategoryChange={setEditPublishSourceCategory}
          onOpenListingAnalysis={() => {
            if (canAccessListingAnalysis(currentUser?.subscription_type)) setScreen('listingAnalysis');
          }}
          onCreateAd={(categoryId, opts) => {
            setEditPublishSourceCategory(Number(categoryId));
            openAdsForm({category: categoryId, bnbHostType: opts?.bnbHostType ?? null});
          }}
          onEditAd={listing => {
            const listingCat = listing?.category != null ? parseInt(String(listing.category), 10) : NaN;
            if (Number.isFinite(listingCat)) setEditPublishSourceCategory(listingCat);
            openAdsForm({category: Number.isFinite(listingCat) ? listingCat : null, listing});
          }}
          onCreatePost={(categoryId, opts) => {
            const listingCat = toCategoryId(categoryId);
            if (listingCat != null) {
              setSelectedCategory(String(listingCat));
              setEditPublishSourceCategory(listingCat);
            }
            openPostEditor({
              publishTarget: 'post',
              returnScreen: 'editPublish',
              listingCategoryId: listingCat,
              postDescriptionLabel: opts?.openHouse ? OPEN_HOUSE_POST_DESCRIPTION : DEFAULT_POST_DESCRIPTION,
            });
          }}
          onEditPost={listing => {
            const listingCat = toCategoryId(listing?.category);
            if (listingCat != null) {
              setSelectedCategory(String(listingCat));
              setEditPublishSourceCategory(listingCat);
            }
            openPostEditor({
              publishTarget: 'post',
              returnScreen: 'editPublish',
              listingCategoryId: listingCat,
              editingListing: listing ?? null,
              postDescriptionLabel: isOpenHouseListing(listing)
                ? OPEN_HOUSE_POST_DESCRIPTION
                : DEFAULT_POST_DESCRIPTION,
            });
          }}
          onFreeze={async listing => {
            try {
              await updateListingFreeze(listing?.id ?? listing?.ad_number, true);
            } catch (e) {
              window.alert(e?.message || 'שגיאה בהקפאת המודעה');
            }
          }}
          onUnfreeze={async listing => {
            try {
              await updateListingFreeze(listing?.id ?? listing?.ad_number, false);
            } catch (e) {
              window.alert(e?.message || 'שגיאה בביטול הקפאה');
            }
          }}
          onRemove={listing => {
            const id = listing?.id ?? listing?.ad_number;
            if (id == null) return;
            const idStr = String(id);
            setUploadedListings(prev => prev.filter(l => String(l.id ?? l.ad_number) !== idStr));
          }}
        />
        </div>
      ) : null}
      {adsFormMounted ? (
        <div inert={editorOverAdsForm ? true : undefined} style={{display: 'contents'}}>
          <AdsForm
            key={adsFormKey}
            active={!editorOverAdsForm}
            currentUser={currentUser}
            initialCategory={selectedCategory}
            initialListing={editingListing}
            initialBnbHostType={editingListing ? null : bnbPublishHostType}
            pendingSalesImageFromEditor={adsFormPendingSalesImage}
            onPendingSalesImageConsumed={() => setAdsFormPendingSalesImage(null)}
            onOpenPostEditor={handleOpenPostEditorFromAdsForm}
            onClose={leaveAdsForm}
            onPublish={handleAdPublish}
          />
        </div>
      ) : null}
      {screen === 'postEditor' ? (
        <Suspense fallback={screenFallback}>
          <PostEditorScreen
            key={postEditorKey}
            publishTarget={postEditorConfig.publishTarget}
            skipStoryPublish={postEditorConfig.skipStoryPublish === true}
            selectedCategory={selectedCategory}
            publishCategoryId={postEditorConfig.listingCategoryId}
            initialListing={postEditorConfig.editingListing}
            defaultPostDescription={postEditorConfig.postDescriptionLabel}
            currentUser={currentUser}
            onClose={closePostEditor}
            onPublish={handlePostPublish}
          />
        </Suspense>
      ) : null}
      {screen === 'listingAnalysis' ? (
        <Suspense fallback={screenFallback}>
          <ListingAnalysisScreen
            currentUser={currentUser}
            listingOwnerUser={null}
            onClose={() => setScreen('editPublish')}
          />
        </Suspense>
      ) : null}
      <PublishSuccessToast
        visible={toast.visible}
        message={toast.message}
        onDismiss={() => setToast(t => ({...t, visible: false}))}
      />
    </>
  );
}
