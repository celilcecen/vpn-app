import * as Haptics from 'expo-haptics';

function hasFn(name) {
  return Haptics && typeof Haptics[name] === 'function';
}

export async function hapticSelection() {
  try {
    if (hasFn('selectionAsync')) await Haptics.selectionAsync();
  } catch (_) {}
}

export async function hapticImpactLight() {
  try {
    if (!hasFn('impactAsync')) return;
    const style = Haptics?.ImpactFeedbackStyle?.Light;
    await Haptics.impactAsync(style ?? 'light');
  } catch (_) {}
}

export async function hapticImpactMedium() {
  try {
    if (!hasFn('impactAsync')) return;
    const style = Haptics?.ImpactFeedbackStyle?.Medium;
    await Haptics.impactAsync(style ?? 'medium');
  } catch (_) {}
}

export async function hapticNotifySuccess() {
  try {
    if (!hasFn('notificationAsync')) return;
    const type = Haptics?.NotificationFeedbackType?.Success;
    await Haptics.notificationAsync(type ?? 'success');
  } catch (_) {}
}
