/**
 * EAS ignores the local android/ folder (.easignore) and runs prebuild on the
 * server. This plugin:
 *  1) Pads the app above the system nav bar (so UI isn't covered)
 *  2) Forces a dark nav bar / window background (so the bar isn't white)
 */
const {
  withMainActivity,
  withAndroidStyles,
  withAndroidColors,
  AndroidConfig,
} = require('@expo/config-plugins');

const NAV_COLOR = '#1E1D27';

const IMPORTS = [
  'import android.graphics.Color',
  'import android.graphics.drawable.ColorDrawable',
  'import android.os.Build',
  'import android.view.View',
  'import androidx.core.graphics.Insets',
  'import androidx.core.view.ViewCompat',
  'import androidx.core.view.WindowCompat',
  'import androidx.core.view.WindowInsetsCompat',
  'import androidx.core.view.WindowInsetsControllerCompat',
];

const HELPERS = `
  override fun onResume() {
    super.onResume()
    applySystemBarStyle()
  }

  private fun applySystemBarStyle() {
    WindowCompat.setDecorFitsSystemWindows(window, false)
    window.statusBarColor = Color.TRANSPARENT
    window.navigationBarColor = Color.parseColor("${NAV_COLOR}")
    window.setBackgroundDrawable(ColorDrawable(Color.parseColor("${NAV_COLOR}")))
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      window.navigationBarDividerColor = Color.TRANSPARENT
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      window.isNavigationBarContrastEnforced = false
      window.isStatusBarContrastEnforced = false
    }
    val controller = WindowInsetsControllerCompat(window, window.decorView)
    controller.isAppearanceLightStatusBars = false
    controller.isAppearanceLightNavigationBars = false
  }

  /** App content ends where the Android bottom toolbar starts. */
  private fun applyBottomBarBoundary() {
    val content = findViewById<View>(android.R.id.content)
    // Padding area uses this background — Light AppTheme defaults to white.
    content.setBackgroundColor(Color.parseColor("${NAV_COLOR}"))
    ViewCompat.setOnApplyWindowInsetsListener(content) { view, insets ->
      val navBars = insets.getInsets(WindowInsetsCompat.Type.navigationBars())
      val ime = insets.getInsets(WindowInsetsCompat.Type.ime())
      val bottomPad = if (ime.bottom > 0) 0 else navBars.bottom
      view.setPadding(0, 0, 0, bottomPad)
      WindowInsetsCompat.Builder(insets)
        .setInsets(
          WindowInsetsCompat.Type.navigationBars(),
          Insets.of(navBars.left, navBars.top, navBars.right, 0),
        )
        .build()
    }
    ViewCompat.requestApplyInsets(content)
  }
`;

function ensureImports(contents) {
  let next = contents;
  for (const line of IMPORTS) {
    if (!next.includes(line)) {
      next = next.replace(/(package [^\n]+\n)/, `$1\n${line}\n`);
    }
  }
  return next;
}

function withMainActivityNavBar(config) {
  return withMainActivity(config, cfg => {
    let contents = cfg.modResults.contents;
    if (typeof contents !== 'string') return cfg;

    // Always refresh helpers if an older plugin version was applied.
    if (contents.includes('applyBottomBarBoundary')) {
      // Still ensure dark background line exists (upgrade path).
      if (!contents.includes('content.setBackgroundColor')) {
        contents = contents.replace(
          'val content = findViewById<View>(android.R.id.content)',
          `val content = findViewById<View>(android.R.id.content)\n    content.setBackgroundColor(Color.parseColor("${NAV_COLOR}"))`,
        );
      }
      if (!contents.includes('ColorDrawable')) {
        contents = ensureImports(contents);
        contents = contents.replace(
          'window.navigationBarColor = Color.parseColor("#1E1D27")',
          `window.navigationBarColor = Color.parseColor("${NAV_COLOR}")\n    window.setBackgroundDrawable(ColorDrawable(Color.parseColor("${NAV_COLOR}")))`,
        );
      }
      cfg.modResults.contents = contents;
      return cfg;
    }

    contents = ensureImports(contents);

    if (/super\.onCreate\([^)]*\)/.test(contents)) {
      contents = contents.replace(
        /super\.onCreate\([^)]*\)/,
        match =>
          `${match}\n    window.decorView.layoutDirection = View.LAYOUT_DIRECTION_RTL\n    applySystemBarStyle()\n    applyBottomBarBoundary()`,
      );
    }

    if (contents.includes('override fun getMainComponentName')) {
      contents = contents.replace(
        /override fun getMainComponentName/,
        `${HELPERS}\n  override fun getMainComponentName`,
      );
    } else if (contents.includes('companion object')) {
      contents = contents.replace(
        /companion object/,
        `${HELPERS}\n  companion object`,
      );
    } else {
      contents = contents.replace(/\n}\s*$/, `\n${HELPERS}\n}\n`);
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
}

/** Expo default AppTheme is Light — that paints a white system nav bar. */
function withDarkNavBarStyles(config) {
  return withAndroidStyles(config, cfg => {
    const parent = AndroidConfig.Styles.getAppThemeLightNoActionBarGroup();
    const items = [
      {name: 'android:navigationBarColor', value: '@color/navigationBar'},
      {name: 'android:windowBackground', value: '@color/navigationBar'},
      {
        name: 'android:enforceNavigationBarContrast',
        value: 'false',
        targetApi: '29',
      },
      {
        name: 'android:windowLightNavigationBar',
        value: 'false',
        targetApi: '27',
      },
      {
        name: 'android:navigationBarDividerColor',
        value: '@android:color/transparent',
        targetApi: '28',
      },
    ];
    for (const item of items) {
      cfg.modResults = AndroidConfig.Styles.assignStylesValue(cfg.modResults, {
        add: true,
        parent,
        name: item.name,
        value: item.value,
        targetApi: item.targetApi,
      });
    }
    return cfg;
  });
}

function withNavBarColorResource(config) {
  return withAndroidColors(config, cfg => {
    cfg.modResults = AndroidConfig.Colors.assignColorValue(cfg.modResults, {
      name: 'navigationBar',
      value: NAV_COLOR,
    });
    return cfg;
  });
}

function withAndroidNavBarInset(config) {
  config = withNavBarColorResource(config);
  config = withDarkNavBarStyles(config);
  config = withMainActivityNavBar(config);
  return config;
}

module.exports = withAndroidNavBarInset;
