/** Chat endpoints — same as mobile utils/api.js. */
import {apiBase, apiFetch, toFormDataFile, toSubscriptionId, uploadFile} from './client';

export async function getChatUnreadCount(userEmail, afterIso = null) {
  if (!userEmail) return {success: true, count: 0};
  const params = new URLSearchParams({user_email: String(userEmail).trim().toLowerCase()});
  if (afterIso) params.set('after', afterIso);
  const response = await apiFetch(`${apiBase()}/api/chat/unread-count?${params.toString()}`);
  const data = await response.json();
  if (!response.ok) return {success: true, count: 0};
  return {success: true, count: typeof data.count === 'number' ? data.count : 0};
}

export async function getChatConversations(userEmail) {
  if (!userEmail) return {success: true, conversations: []};
  const email = String(userEmail).trim().toLowerCase();
  const response = await apiFetch(`${apiBase()}/api/chat/conversations?user_email=${encodeURIComponent(email)}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to load conversations');
  return data;
}

export async function deleteChatConversation(userEmail, otherUserEmail) {
  const email = userEmail != null ? String(userEmail).trim().toLowerCase() : '';
  const other = otherUserEmail != null ? String(otherUserEmail).trim().toLowerCase() : '';
  if (!email || !other) throw new Error('userEmail and otherUserEmail required');
  const response = await apiFetch(`${apiBase()}/api/chat/conversations`, {
    method: 'DELETE',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({user_email: email, other_user_email: other}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Failed to delete conversation');
  return data;
}

export async function searchBrokers(q, excludeEmail = null) {
  const query = String(q || '').trim();
  if (query.length < 2) return {success: true, brokers: []};
  const params = new URLSearchParams({q: query});
  if (excludeEmail) params.set('exclude_email', String(excludeEmail).trim().toLowerCase());
  const response = await apiFetch(`${apiBase()}/api/brokers/search?${params.toString()}`);
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error('תשובה לא תקינה מהשרת');
  }
  if (!response.ok) throw new Error(data.error || 'Broker search failed');
  return {success: !!data.success, brokers: data.brokers || []};
}

export async function getDirectContactsForGroup(userEmail, q = '', audience = 'all') {
  if (!userEmail) return {success: true, contacts: []};
  const params = new URLSearchParams({
    user_email: String(userEmail).trim().toLowerCase(),
    q: String(q || '').trim(),
  });
  const aud = String(audience || 'all').trim().toLowerCase();
  if (aud === 'regular' || aud === 'non_regular' || aud === 'all') params.set('audience', aud);
  const response = await apiFetch(`${apiBase()}/api/chat/direct-contacts?${params.toString()}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to load contacts');
  return {success: !!data.success, contacts: data.contacts || []};
}

export async function getBrokersForGroupPicker(q, excludeEmail = null) {
  const params = new URLSearchParams();
  if (q != null && String(q).trim()) params.set('q', String(q).trim());
  if (excludeEmail) params.set('exclude_email', String(excludeEmail).trim().toLowerCase());
  const response = await apiFetch(`${apiBase()}/api/brokers/group-picker?${params.toString()}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to load brokers');
  return {success: !!data.success, brokers: data.brokers || []};
}

export async function getUsersForGroupPicker(q = '', excludeEmail = null, audience = 'all') {
  const params = new URLSearchParams();
  if (q != null && String(q).trim()) params.set('q', String(q).trim());
  if (excludeEmail) params.set('exclude_email', String(excludeEmail).trim().toLowerCase());
  const aud = String(audience || 'all').trim().toLowerCase();
  if (aud === 'regular' || aud === 'broker_only' || aud === 'non_regular' || aud === 'all') {
    params.set('audience', aud);
  }
  const response = await apiFetch(`${apiBase()}/api/users/group-picker?${params.toString()}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to load users');
  return {success: !!data.success, users: data.users || []};
}

export async function createChatGroup({
  creatorEmail,
  creatorSubscriptionId,
  memberEmails,
  title,
  kind,
  groupImageUrl = null,
}) {
  const kindNorm = String(kind || '').trim().toLowerCase();
  const payload = {
    creator_email: String(creatorEmail).trim().toLowerCase(),
    member_emails: (memberEmails || []).map(e => String(e).trim().toLowerCase()).filter(Boolean),
    title: title != null ? String(title).trim() : '',
    kind: kindNorm === 'brokers' ? 'brokers' : kindNorm === 'open' ? 'open' : 'customers',
  };
  const subId = creatorSubscriptionId != null ? String(creatorSubscriptionId).trim() : '';
  if (subId) payload.creator_subscription_id = subId;
  if (groupImageUrl != null && String(groupImageUrl).trim()) {
    payload.group_image_url = String(groupImageUrl).trim();
  }
  const response = await apiFetch(`${apiBase()}/api/chat/groups`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to create group');
  return data;
}

export async function addMembersToChatGroup({userEmail, conversationId, memberEmails}) {
  const payload = {
    user_email: String(userEmail || '').trim().toLowerCase(),
    conversation_id: String(conversationId || '').trim(),
    member_emails: (memberEmails || []).map(e => String(e || '').trim().toLowerCase()).filter(Boolean),
  };
  const response = await apiFetch(`${apiBase()}/api/chat/groups/add-members`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to add members');
  return data;
}

export async function getGroupChatMessages(userEmail, conversationId) {
  if (!userEmail || !conversationId) return {success: true, messages: [], conversation_id: null};
  const params = new URLSearchParams({
    user_email: String(userEmail).trim().toLowerCase(),
    conversation_id: String(conversationId).trim(),
  });
  const response = await apiFetch(`${apiBase()}/api/chat/group-messages?${params.toString()}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to load messages');
  return data;
}

export async function updateGroupDescription({userEmail, conversationId, description}) {
  const response = await apiFetch(`${apiBase()}/api/chat/group-description`, {
    method: 'PATCH',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      user_email: String(userEmail).trim().toLowerCase(),
      conversation_id: String(conversationId).trim(),
      group_description: description != null ? String(description) : '',
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to save description');
  return data;
}

export async function updateGroupTitle({userEmail, conversationId, title}) {
  const response = await apiFetch(`${apiBase()}/api/chat/group-title`, {
    method: 'PATCH',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      user_email: String(userEmail || '').trim().toLowerCase(),
      conversation_id: String(conversationId || '').trim(),
      title: title != null ? String(title).trim() : '',
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to save title');
  return data;
}

export async function removeMemberFromChatGroup({userEmail, conversationId, memberEmail}) {
  const response = await apiFetch(`${apiBase()}/api/chat/groups/remove-member`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      user_email: String(userEmail || '').trim().toLowerCase(),
      conversation_id: String(conversationId || '').trim(),
      member_email: String(memberEmail || '').trim().toLowerCase(),
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to remove member');
  return data;
}

export async function updateGroupMemberRole({userEmail, conversationId, targetEmail, role}) {
  const response = await apiFetch(`${apiBase()}/api/chat/groups/member-role`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      user_email: String(userEmail || '').trim().toLowerCase(),
      conversation_id: String(conversationId || '').trim(),
      target_email: String(targetEmail || '').trim().toLowerCase(),
      role: role === 'manager' ? 'manager' : 'member',
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to update role');
  return data;
}

export async function sendGroupChatMessage(
  conversationId,
  senderEmail,
  body,
  media = null,
  listingId = null,
  listingShare = false,
) {
  const payload = {
    conversation_id: String(conversationId).trim(),
    sender_email: String(senderEmail).trim().toLowerCase(),
    body: body != null ? String(body).trim() : '',
  };
  if (media?.url && (media.type === 'image' || media.type === 'audio' || media.type === 'file' || media.type === 'video')) {
    payload.media_type = media.type;
    payload.media_url = String(media.url).trim();
  }
  if (listingId != null && String(listingId).trim() !== '') payload.listing_id = String(listingId).trim();
  if (listingShare) payload.listing_share = true;
  const response = await apiFetch(`${apiBase()}/api/chat/group-messages`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to send');
  return data;
}

export async function getChatParticipantDisplay(userRef) {
  if (!userRef) return {success: true, name: null, profileImageUrl: null};
  const ref = String(userRef).trim();
  const response = await apiFetch(`${apiBase()}/api/chat/participant-display?user_ref=${encodeURIComponent(ref)}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to load participant display');
  return data;
}

export async function getListingPreview(listingId) {
  if (!listingId) return null;
  const id = String(listingId).trim();
  if (!id) return null;
  try {
    const response = await apiFetch(`${apiBase()}/api/listings/${encodeURIComponent(id)}/preview`);
    const data = await response.json();
    if (!response.ok) return null;
    return data?.listing || null;
  } catch {
    return null;
  }
}

export async function getChatMessages(myEmail, otherUserEmail, conversationId = null) {
  if (!myEmail) return {success: true, messages: []};
  const convId = conversationId != null ? String(conversationId).trim() : '';
  const otherRef = otherUserEmail != null ? String(otherUserEmail).trim().toLowerCase() : '';
  if (!convId && !otherRef) return {success: true, messages: []};
  const params = new URLSearchParams({user_email: String(myEmail).trim().toLowerCase()});
  if (convId) params.set('conversation_id', convId);
  if (otherRef) params.set('other_user_email', otherRef);
  const response = await apiFetch(`${apiBase()}/api/chat/messages?${params.toString()}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to load messages');
  return data;
}

export async function respondToExclusiveOffer({userEmail, conversationId, accept}) {
  const response = await apiFetch(`${apiBase()}/api/chat/exclusive-offer/respond`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      user_email: String(userEmail || '').trim().toLowerCase(),
      conversation_id: String(conversationId || '').trim(),
      accept: !!accept,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to update offer');
  return data;
}

export async function sendChatMessage(
  senderEmail,
  receiverEmail,
  body,
  receiverDisplay = null,
  senderDisplay = null,
  media = null,
  listingId = null,
  listingShare = false,
) {
  const text = body != null ? String(body).trim() : '';
  const hasMedia =
    media?.url && (media.type === 'image' || media.type === 'audio' || media.type === 'file' || media.type === 'video');
  if (!senderEmail || !receiverEmail || (!text && !hasMedia)) {
    throw new Error('senderEmail, receiverEmail and body or media required');
  }
  const payload = {
    sender_email: String(senderEmail).trim().toLowerCase(),
    receiver_email: String(receiverEmail).trim().toLowerCase(),
    body: text,
  };
  if (hasMedia) {
    payload.media_type = media.type;
    payload.media_url = String(media.url).trim();
  }
  if (receiverDisplay) {
    if (receiverDisplay.name != null) payload.receiver_display_name = String(receiverDisplay.name);
    if (receiverDisplay.profileImageUrl != null) {
      payload.receiver_profile_picture_url = String(receiverDisplay.profileImageUrl);
    }
  }
  if (senderDisplay) {
    if (senderDisplay.name != null) payload.sender_display_name = String(senderDisplay.name);
    if (senderDisplay.profileImageUrl != null) {
      payload.sender_profile_picture_url = String(senderDisplay.profileImageUrl);
    }
  }
  if (listingId != null && String(listingId).trim() !== '') payload.listing_id = String(listingId).trim();
  if (listingShare) payload.listing_share = true;
  const response = await apiFetch(`${apiBase()}/api/chat/messages`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to send message');
  return data;
}

export async function deleteChatMessage(messageId, userEmail) {
  const id = messageId != null ? String(messageId).trim() : '';
  const email = userEmail != null ? String(userEmail).trim().toLowerCase() : '';
  if (!id || !email) throw new Error('messageId and userEmail required');
  const response = await apiFetch(`${apiBase()}/api/chat/messages/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({user_email: email}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Failed to delete message');
  return data;
}

export async function uploadChatMedia(file) {
  try {
    const result = await uploadFile(file, 'chat', {bucket: 'chat', timeoutMs: 180000});
    if (result?.url) return {success: true, url: result.url};
    throw new Error('Upload failed');
  } catch (error) {
    const formData = new FormData();
    const toAppend = await toFormDataFile(file, 'file');
    if (!toAppend) throw error;
    formData.append('file', toAppend);
    const response = await apiFetch(`${apiBase()}/api/chat/upload-media`, {method: 'POST', body: formData});
    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      throw error;
    }
    if (!response.ok) throw new Error(data.error || data.details || 'Failed to upload media');
    return data;
  }
}

export async function uploadGroupImage(file) {
  const formData = new FormData();
  const toAppend = await toFormDataFile(file, 'file');
  if (!toAppend) throw new Error('No file to upload');
  formData.append('file', toAppend);
  const response = await apiFetch(`${apiBase()}/api/chat/upload-group-image`, {method: 'POST', body: formData});
  const responseText = await response.text();
  let data;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(`Upload failed (${response.status})`);
  }
  if (!response.ok) throw new Error(data.error || data.details || 'Failed to upload group image');
  return data;
}

export async function updateSubscriptionProfile(subscriptionId, fields = {}) {
  const id = toSubscriptionId(subscriptionId);
  if (!id) throw new Error('Valid subscription id is required');
  const response = await apiFetch(`${apiBase()}/api/subscription/${id}`, {
    method: 'PATCH',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(fields || {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Failed to update profile');
  return data;
}
