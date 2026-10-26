import {useEffect, useMemo, useState} from 'react';
import {
  addPostComment,
  clearPostCommentReaction,
  getPostComments,
  reactToPostComment,
  recordListingShare,
  uploadFile,
} from '../api/client';
import {getChatConversations, sendChatMessage, sendGroupChatMessage} from '../api/chat';
import {getUserProfileImageUrl} from '../profile/lib/userProfileImage';
import noProfileImage from '../assets/noprofileimage.png';
import commentHeart from '../assets/feed/comment-heart.svg';
import commentDislike from '../assets/feed/comment-dislike.svg';
import StagePortal from './StagePortal';
import styles from './FeedSheets.module.css';

function useSheetEscape(onClose) {
  useEffect(() => {
    const onKey = e => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onClose?.();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);
}

function Sheet({title, onClose, children}) {
  useSheetEscape(onClose);
  return (
    <StagePortal>
      <div className={styles.backdrop} data-account-modal="" onClick={onClose}>
        <div
          className={styles.sheet}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={e => e.stopPropagation()}>
          <button type="button" className={styles.handle} aria-label="סגור" onClick={onClose} />
          <div className={styles.head}>
            <h2>{title}</h2>
            <button type="button" className={styles.close} onClick={onClose}>
              סגור
            </button>
          </div>
          {children}
        </div>
      </div>
    </StagePortal>
  );
}

function formatCommentDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'});
}

function formatCommentAgo(value) {
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts)) return 'לפני רגע';
  const deltaSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (deltaSec < 60) return 'לפני רגע';
  const mins = Math.floor(deltaSec / 60);
  if (mins < 60) return mins === 1 ? 'לפני דקה' : `לפני ${mins} דק׳`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours === 1 ? 'לפני שעה' : `לפני ${hours} שעות`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'לפני יום';
  return `לפני ${days} ימים`;
}

export function CommentsSheet({postId, userId, onClose, onCount}) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPostComments(postId, userId)
      .then(data => {
        if (cancelled) return;
        const rows = Array.isArray(data?.comments) ? data.comments : [];
        setComments(rows);
        onCount?.(rows.length);
      })
      .catch(err => {
        if (!cancelled) window.alert(err?.message || 'לא ניתן לטעון תגובות');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // onCount is a live setter; reloading only when the post or user changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, userId]);

  const send = async () => {
    const body = text.trim();
    if ((!body && !image) || sending) return;
    setSending(true);
    try {
      let imageUrl = null;
      if (image) {
        const uploaded = await uploadFile(image, 'post-comments');
        imageUrl = uploaded?.url || uploaded?.publicUrl || null;
        if (!imageUrl) throw new Error('לא התקבלה כתובת תמונה');
      }
      const data = await addPostComment(postId, userId, body, imageUrl);
      const created = data?.comment;
      setComments(prev => (created ? [...prev, created] : prev));
      if (created) onCount?.(comments.length + 1);
      setText('');
      setImage(null);
    } catch (err) {
      window.alert(err?.message || 'לא ניתן לשלוח תגובה');
    } finally {
      setSending(false);
    }
  };

  const react = async (comment, type) => {
    const prev = comments;
    const current = comment.my_reaction || null;
    const clearing = current === type;
    setComments(rows =>
      rows.map(row => {
        if (row.id !== comment.id) return row;
        let likes = Number(row.likes_count) || 0;
        let dislikes = Number(row.dislikes_count) || 0;
        if (current === 'like') likes = Math.max(0, likes - 1);
        if (current === 'dislike') dislikes = Math.max(0, dislikes - 1);
        if (!clearing && type === 'like') likes += 1;
        if (!clearing && type === 'dislike') dislikes += 1;
        return {...row, likes_count: likes, dislikes_count: dislikes, my_reaction: clearing ? null : type};
      }),
    );
    try {
      if (clearing) await clearPostCommentReaction(postId, comment.id, userId);
      else await reactToPostComment(postId, comment.id, userId, type);
    } catch (err) {
      setComments(prev);
      window.alert(err?.message || 'לא ניתן לעדכן תגובה');
    }
  };

  useSheetEscape(onClose);

  return (
    <div className={styles.commentsPanel}>
      <div className={styles.commentsList}>
        {loading ? <p className={styles.commentsEmpty}>טוען תגובות...</p> : null}
        {!loading && comments.length === 0 ? <p className={styles.commentsEmpty}>אין תגובות עדיין</p> : null}
        {comments.map(comment => (
          <article key={comment.id} className={styles.commentCard}>
            <div className={styles.commentMain}>
              <div className={styles.commentWho}>
                <div className={styles.commentIdentity}>
                  <p className={styles.commentName} dir="auto">
                    {comment.commenter_name || 'משתמש'}
                  </p>
                  <p className={styles.commentDate}>{formatCommentDate(comment.created_at)}</p>
                </div>
                <img className={styles.commentAvatar} src={comment.commenter_image_url || noProfileImage} alt="" />
              </div>
              {comment.comment_text ? (
                <p className={styles.commentText} dir="auto">
                  {comment.comment_text}
                </p>
              ) : null}
              {comment.comment_image_url ? <img className={styles.commentPhoto} src={comment.comment_image_url} alt="" /> : null}
            </div>
            <div className={styles.commentFoot}>
              <p className={styles.commentWhen} dir="auto">
                {formatCommentAgo(comment.created_at)}
              </p>
              <div className={styles.commentReactions}>
                <button
                  type="button"
                  className={styles.commentLike}
                  aria-label="לייק"
                  aria-pressed={comment.my_reaction === 'like'}
                  onClick={() => react(comment, 'like')}>
                  <img
                    className={comment.my_reaction === 'like' ? `${styles.commentIcon} ${styles.commentIconOn}` : styles.commentIcon}
                    src={commentHeart}
                    alt=""
                  />
                  <span className={styles.commentLikeCount}>{Number(comment.likes_count) || 0}</span>
                </button>
                <button
                  type="button"
                  className={styles.commentDislike}
                  aria-label="לא אהבתי"
                  aria-pressed={comment.my_reaction === 'dislike'}
                  onClick={() => react(comment, 'dislike')}>
                  <img
                    className={comment.my_reaction === 'dislike' ? `${styles.commentIcon} ${styles.commentIconOn}` : styles.commentIcon}
                    src={commentDislike}
                    alt=""
                  />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      <form
        className={styles.commentsComposer}
        onSubmit={e => {
          e.preventDefault();
          send();
        }}>
        <input
          className={styles.commentsInput}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="כתוב תגובה"
          dir="rtl"
        />
        <label className={styles.commentsGhost}>
          {image ? 'תמונה נבחרה' : 'תמונה'}
          <input
            hidden
            type="file"
            accept="image/*"
            onChange={e => {
              setImage(e.target.files?.[0] || null);
              e.target.value = '';
            }}
          />
        </label>
        <button type="submit" className={styles.commentsSend} disabled={sending || (!text.trim() && !image)}>
          {sending ? 'שולח...' : 'שלח'}
        </button>
      </form>
    </div>
  );
}

function shareText(item) {
  const kind = item.isPost ? 'פוסט' : 'מודעה';
  const caption = String(item.description || item.creatorName || '').trim();
  return [kind, caption, window.location.origin].filter(Boolean).join('\n');
}

async function copyShare(item) {
  const text = shareText(item);
  try {
    await navigator.clipboard.writeText(text);
    window.alert('הקישור הועתק');
  } catch {
    window.alert(text);
  }
}

export function ShareSheet({item, user, onClose, onShared, onOpenChat}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [sendingId, setSendingId] = useState(null);
  const email = user?.email ? String(user.email).trim().toLowerCase() : '';

  useEffect(() => {
    let cancelled = false;
    if (!email) {
      setRows([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    getChatConversations(email)
      .then(res => {
        if (cancelled) return;
        const list = Array.isArray(res?.conversations) ? res.conversations : [];
        setRows(
          list
            .filter(c => c && c.id !== '1' && c.isPi !== true)
            .map(c => ({
              id: c.otherUserEmail || c.id,
              conversationId: c.id,
              otherUserEmail: c.otherUserEmail || null,
              isGroup: c.isGroup === true,
              name: c.name || 'משתמש',
              profileImageUrl: getUserProfileImageUrl(c) || c.profileImageUrl || null,
            })),
        );
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [email]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(row => String(row.name || '').toLowerCase().includes(q));
  }, [query, rows]);

  const counted = async () => {
    const serverCount = await recordListingShare(item.id, 1);
    onShared?.(serverCount);
  };

  const sendTo = async conv => {
    if (!conv || sendingId) return;
    setSendingId(conv.id);
    const fallback = item.isPost ? 'פוסט משותף' : 'מודעה משותפת';
    const imageUrl = Array.isArray(item.images) && item.images[0] ? item.images[0] : null;
    const media = imageUrl ? {type: 'image', url: imageUrl} : null;
    const senderDisplay = {
      name: user?.name || user?.contact_person_name || user?.business_name || null,
      profileImageUrl: getUserProfileImageUrl(user) || null,
    };
    try {
      if (conv.isGroup) {
        await sendGroupChatMessage(conv.conversationId || conv.id, email, fallback, media, item.id, true);
      } else if (conv.otherUserEmail) {
        await sendChatMessage(
          email,
          conv.otherUserEmail,
          fallback,
          {name: conv.name || null, profileImageUrl: conv.profileImageUrl || null},
          senderDisplay,
          media,
          item.id,
          true,
        );
      } else {
        throw new Error('לא ניתן לשלוח לשיחה הזו');
      }
      await counted();
      onClose?.();
      if (!conv.isGroup && conv.otherUserEmail) {
        onOpenChat?.({
          email: conv.otherUserEmail,
          name: conv.name,
          profileImageUrl: conv.profileImageUrl,
          listingId: item.isPost ? null : item.id,
        });
      } else {
        window.alert('נשלח');
      }
    } catch (err) {
      window.alert(err?.message || 'השיתוף נכשל');
    } finally {
      setSendingId(null);
    }
  };

  return (
    <Sheet title={item.isPost ? 'שיתוף פוסט' : 'שיתוף מודעה'} onClose={onClose}>
      <input className={styles.search} value={query} onChange={e => setQuery(e.target.value)} placeholder="חיפוש שיחה" dir="rtl" />
      <div className={styles.list}>
        {loading ? <p className={styles.empty}>טוען שיחות...</p> : null}
        {!loading && visible.length === 0 ? <p className={styles.empty}>אין שיחות לשיתוף</p> : null}
        {visible.map(conv => (
          <button key={String(conv.id)} type="button" className={styles.conv} disabled={!!sendingId} onClick={() => sendTo(conv)}>
            <img src={conv.profileImageUrl || noProfileImage} alt="" />
            <span>{sendingId === conv.id ? 'שולח...' : conv.name}</span>
          </button>
        ))}
      </div>
      <div className={styles.shareRow}>
        <button
          type="button"
          className={styles.ghost}
          onClick={async () => {
            await copyShare(item);
            await counted();
          }}>
          העתק קישור
        </button>
        <button
          type="button"
          className={styles.ghost}
          onClick={async () => {
            const text = shareText(item);
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
            await counted();
          }}>
          וואטסאפ
        </button>
        {typeof navigator.share === 'function' ? (
          <button
            type="button"
            className={styles.send}
            onClick={async () => {
              try {
                await navigator.share({text: shareText(item)});
                await counted();
              } catch (err) {
                if (err?.name !== 'AbortError') window.alert('השיתוף בוטל');
              }
            }}>
            שתף
          </button>
        ) : null}
      </div>
    </Sheet>
  );
}

export function OptionsSheet({item, onClose, onShare, onReport}) {
  return (
    <Sheet title="אפשרויות" onClose={onClose}>
      <div className={styles.menu}>
        <button
          type="button"
          className={styles.menuItem}
          onClick={() => {
            onClose?.();
            onShare?.();
          }}>
          שתף
        </button>
        <button
          type="button"
          className={styles.menuItem}
          onClick={() => {
            onClose?.();
            onReport?.();
          }}>
          דווח
        </button>
        <button
          type="button"
          className={styles.menuItem}
          onClick={async () => {
            await copyShare(item);
            onClose?.();
          }}>
          העתק קישור
        </button>
      </div>
    </Sheet>
  );
}

export function listingChatPeer(item) {
  const raw = item?.raw || {};
  const email = String(raw.creator_email || raw.email || raw.owner_email || '').trim();
  const subscriptionId = raw.subscription_id || raw.owner_id || raw.creator_subscription_id || null;
  const subscriptionType = String(
    raw.creator_subscription_type || raw.subscription_type || raw.created_by_subscription_type || '',
  )
    .trim()
    .toLowerCase();
  return {
    email: email || null,
    subscriptionId: subscriptionId ? String(subscriptionId) : null,
    name: item?.creatorName || raw.creator_name || '',
    profileImageUrl: item?.creatorAvatar || null,
    listingId: item?.isPost ? null : item?.id || null,
    subscriptionType: subscriptionType || null,
  };
}

export function reportTarget(item) {
  const raw = item?.raw || {};
  const type = String(raw.creator_subscription_type || raw.subscription_type || '').toLowerCase();
  const category = Number(raw.category);
  const reportedSubscriptionId = raw.subscription_id || raw.owner_id || null;
  const base = {
    reportedListingId: item?.id || null,
    reportedSubscriptionId,
    displayName: item?.creatorName || '',
  };
  if (category === 5 || type.includes('bnb')) return {...base, subjectType: 'bnb'};
  if (type.includes('broker') || type === 'agent') return {...base, subjectType: 'broker'};
  if (type.includes('professional')) return {...base, subjectType: 'professional'};
  if (type.includes('company') || type.includes('developer') || type === 'project_marketer') {
    return {...base, subjectType: 'company'};
  }
  return null;
}
