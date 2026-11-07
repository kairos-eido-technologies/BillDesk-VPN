package com.msspk.store;

import android.annotation.SuppressLint;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.text.TextUtils;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.ImageButton;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.google.android.material.textfield.TextInputEditText;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends AppCompatActivity {

    private static final String PREFS_NAME = "mssp_store_prefs";
    private static final String KEY_SERVER_URL = "server_url";
    private static final String DEFAULT_SERVER_URL = "http://100.96.24.23:3000";

    private WebView webView;
    private SwipeRefreshLayout swipeRefresh;
    private ProgressBar pageProgressBar;
    private View topBar;
    private View serverSetupLayout;
    private TextInputEditText etServerUrl;
    private TextView tvConnectionStatus;
    private TextView tvServerPill;
    private Button btnConnect;
    private Button btnCancelConnect;
    private ImageButton btnServerSettings;

    private SharedPreferences prefs;
    private String currentServerUrl = "";
    private boolean doubleBackToExitPressedOnce = false;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        currentServerUrl = prefs.getString(KEY_SERVER_URL, "");

        initViews();
        setupWebView();
        setupListeners();

        if (TextUtils.isEmpty(currentServerUrl)) {
            currentServerUrl = DEFAULT_SERVER_URL;
            prefs.edit().putString(KEY_SERVER_URL, DEFAULT_SERVER_URL).apply();
        }
        loadStoreUrl(currentServerUrl);
    }

    private void initViews() {
        webView = findViewById(R.id.webView);
        swipeRefresh = findViewById(R.id.swipeRefresh);
        pageProgressBar = findViewById(R.id.pageProgressBar);
        topBar = findViewById(R.id.topBar);
        serverSetupLayout = findViewById(R.id.serverSetupLayout);
        etServerUrl = findViewById(R.id.etServerUrl);
        tvConnectionStatus = findViewById(R.id.tvConnectionStatus);
        tvServerPill = findViewById(R.id.tvServerPill);
        btnConnect = findViewById(R.id.btnConnect);
        btnCancelConnect = findViewById(R.id.btnCancelConnect);
        btnServerSettings = findViewById(R.id.btnServerSettings);

        swipeRefresh.setColorSchemeColors(Color.parseColor("#1B2D6B"), Color.parseColor("#E8151B"));
        if (!TextUtils.isEmpty(currentServerUrl)) {
            etServerUrl.setText(currentServerUrl);
        } else {
            etServerUrl.setText(DEFAULT_SERVER_URL);
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setTextZoom(100);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        webView.addJavascriptInterface(new WebAppInterface(this), "AndroidPOS");

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (newProgress < 100) {
                    pageProgressBar.setVisibility(View.VISIBLE);
                    pageProgressBar.setProgress(newProgress);
                } else {
                    pageProgressBar.setVisibility(View.GONE);
                    swipeRefresh.setRefreshing(false);
                }
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                return handleUrl(url);
            }

            @SuppressWarnings("deprecation")
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleUrl(url);
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                setServerPill("CONNECTING...", "#D97706", "#FEF3C7");
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                setServerPill("ONLINE", "#16A34A", "#DCFCE7");
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request.isForMainFrame()) {
                    setServerPill("OFFLINE", "#DC2626", "#FEE2E2");
                    tvConnectionStatus.setVisibility(View.VISIBLE);
                    tvConnectionStatus.setText("Cannot reach desktop server at: " + currentServerUrl + "\nVerify desktop PC is running on the same Wi-Fi.");
                    showServerSetup(false);
                }
            }
        });
    }

    private boolean handleUrl(String url) {
        if (TextUtils.isEmpty(url)) return false;

        // 1. Direct Native WhatsApp handling
        if (url.startsWith("whatsapp://") ||
            url.startsWith("https://api.whatsapp.com/") ||
            url.startsWith("https://wa.me/")) {
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
                return true;
            } catch (ActivityNotFoundException e) {
                try {
                    // Try without strict package
                    Intent fallbackIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(fallbackIntent);
                } catch (Exception ex) {
                    Toast.makeText(this, "WhatsApp is not installed on this device.", Toast.LENGTH_SHORT).show();
                }
                return true;
            }
        }

        // 2. Telephone calls and email links
        if (url.startsWith("tel:") || url.startsWith("mailto:")) {
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                startActivity(intent);
                return true;
            } catch (Exception ignored) {}
        }

        // 3. Keep internal navigation inside the WebView
        if (url.startsWith(currentServerUrl) || url.startsWith("http://") || url.startsWith("https://")) {
            return false;
        }

        return false;
    }

    private void setupListeners() {
        swipeRefresh.setOnRefreshListener(() -> {
            if (!TextUtils.isEmpty(currentServerUrl)) {
                webView.reload();
            } else {
                swipeRefresh.setRefreshing(false);
            }
        });

        btnServerSettings.setOnClickListener(v -> showServerSetup(false));

        btnCancelConnect.setOnClickListener(v -> {
            if (!TextUtils.isEmpty(currentServerUrl)) {
                serverSetupLayout.setVisibility(View.GONE);
            }
        });

        btnConnect.setOnClickListener(v -> {
            String rawUrl = etServerUrl.getText() != null ? etServerUrl.getText().toString().trim() : "";
            if (TextUtils.isEmpty(rawUrl)) {
                etServerUrl.setError("Please enter server URL or IP address");
                return;
            }

            if (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
                rawUrl = "http://" + rawUrl;
            }
            if (rawUrl.endsWith("/")) {
                rawUrl = rawUrl.substring(0, rawUrl.length() - 1);
            }

            final String formattedUrl = rawUrl;
            tvConnectionStatus.setVisibility(View.VISIBLE);
            tvConnectionStatus.setText("Testing connection to " + formattedUrl + " ...");
            btnConnect.setEnabled(false);

            executor.execute(() -> {
                boolean reachable = testServerReachability(formattedUrl);
                mainHandler.post(() -> {
                    btnConnect.setEnabled(true);
                    if (reachable) {
                        prefs.edit().putString(KEY_SERVER_URL, formattedUrl).apply();
                        currentServerUrl = formattedUrl;
                        tvConnectionStatus.setVisibility(View.GONE);
                        serverSetupLayout.setVisibility(View.GONE);
                        loadStoreUrl(formattedUrl);
                        Toast.makeText(MainActivity.this, "Connected to MSS Ponkumar Store Server!", Toast.LENGTH_SHORT).show();
                    } else {
                        tvConnectionStatus.setText("Could not reach desktop server at: " + formattedUrl + 
                            "\n\nPlease verify:\n1. Desktop computer is ON & MSS Ponkumar Store is running.\n2. Both phone and PC are connected to the same shop Wi-Fi.\n3. Port (e.g. :3000) is included.");
                    }
                });
            });
        });
    }

    private boolean testServerReachability(String baseUrl) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(baseUrl + "/api/status");
            conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(4000);
            conn.setReadTimeout(4000);
            conn.setRequestMethod("GET");
            int responseCode = conn.getResponseCode();
            return (responseCode >= 200 && responseCode < 400);
        } catch (IOException ignored) {
            // Try fallback root
            try {
                URL rootUrl = new URL(baseUrl);
                HttpURLConnection rootConn = (HttpURLConnection) rootUrl.openConnection();
                rootConn.setConnectTimeout(3000);
                rootConn.setReadTimeout(3000);
                rootConn.setRequestMethod("GET");
                int code = rootConn.getResponseCode();
                rootConn.disconnect();
                return (code >= 200 && code < 500);
            } catch (Exception e) {
                return false;
            }
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }

    private void showServerSetup(boolean initial) {
        serverSetupLayout.setVisibility(View.VISIBLE);
        btnCancelConnect.setVisibility((!initial && !TextUtils.isEmpty(currentServerUrl)) ? View.VISIBLE : View.GONE);
        if (!TextUtils.isEmpty(currentServerUrl)) {
            etServerUrl.setText(currentServerUrl);
        } else {
            etServerUrl.setText(DEFAULT_SERVER_URL);
        }
    }

    private void loadStoreUrl(String url) {
        serverSetupLayout.setVisibility(View.GONE);
        webView.loadUrl(url);
    }

    private void setServerPill(String status, String textColorHex, String bgHex) {
        tvServerPill.setText(status);
        tvServerPill.setTextColor(Color.parseColor(textColorHex));
        tvServerPill.setBackgroundColor(Color.parseColor(bgHex));
    }

    @Override
    public void onBackPressed() {
        if (serverSetupLayout.getVisibility() == View.VISIBLE && !TextUtils.isEmpty(currentServerUrl)) {
            serverSetupLayout.setVisibility(View.GONE);
            return;
        }

        if (webView.canGoBack()) {
            webView.goBack();
            return;
        }

        if (doubleBackToExitPressedOnce) {
            super.onBackPressed();
            return;
        }

        this.doubleBackToExitPressedOnce = true;
        Toast.makeText(this, "Press BACK again to exit MSS Ponkumar Store", Toast.LENGTH_SHORT).show();

        new Handler(Looper.getMainLooper()).postDelayed(() -> doubleBackToExitPressedOnce = false, 2000);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        executor.shutdown();
        if (webView != null) {
            webView.destroy();
        }
    }

    // JavaScript Interface exposed to Web UI
    public class WebAppInterface {
        Context context;

        WebAppInterface(Context c) {
            context = c;
        }

        @JavascriptInterface
        public void printReceipt(String htmlContent) {
            mainHandler.post(() -> {
                PrintManager printManager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                if (printManager != null && webView != null) {
                    PrintDocumentAdapter printAdapter = webView.createPrintDocumentAdapter("MSSP_Receipt");
                    String jobName = getString(R.string.app_name) + " Receipt Document";
                    printManager.print(jobName, printAdapter, new PrintAttributes.Builder().build());
                }
            });
        }

        @JavascriptInterface
        public void openWhatsApp(String phone, String text) {
            mainHandler.post(() -> {
                try {
                    String cleanPhone = phone.replaceAll("[^0-9]", "");
                    if (cleanPhone.length() == 10) cleanPhone = "91" + cleanPhone;
                    String waUrl = "https://api.whatsapp.com/send?phone=" + cleanPhone + "&text=" + Uri.encode(text);
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(waUrl));
                    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                } catch (Exception e) {
                    Toast.makeText(context, "Could not open WhatsApp: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                }
            });
        }

        @JavascriptInterface
        public String getServerUrl() {
            return currentServerUrl;
        }

        @JavascriptInterface
        public void openServerConfig() {
            mainHandler.post(() -> showServerSetup(false));
        }
    }
}

