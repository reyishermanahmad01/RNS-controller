package com.rns.ledcontroller;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class MainActivity extends BridgeActivity {

    private static final int RNS_PERMISSION_REQUEST_CODE = 4201;
    private boolean chromeClientConfigured = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        configureWebViewDefaults();
        requestMissingRuntimePermissions();
    }

    @Override
    public void onStart() {
        super.onStart();
        configureWebViewDefaults();
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebViewDefaults() {
        try {
            if (getBridge() == null) return;
            WebView webView = getBridge().getWebView();
            if (webView == null) return;
            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);

            if (!chromeClientConfigured) {
                chromeClientConfigured = true;
                webView.setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
                    @Override
                    public void onPermissionRequest(final PermissionRequest request) {
                        if (request == null) return;
                        runOnUiThread(() -> {
                            try {
                                String[] resources = request.getResources();
                                List<String> resList = Arrays.asList(resources);
                                boolean needsCamera = resList.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE);
                                boolean needsAudio = resList.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE);

                                boolean hasCamera = !needsCamera ||
                                    ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA)
                                        == PackageManager.PERMISSION_GRANTED;
                                boolean hasAudio = !needsAudio ||
                                    ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO)
                                        == PackageManager.PERMISSION_GRANTED;

                                if (hasCamera && hasAudio) {
                                    request.grant(resources);
                                    return;
                                }
                                super.onPermissionRequest(request);
                            } catch (IllegalStateException ignored) {
                                // Prevent crash if WebView already disposed the PermissionRequest
                            } catch (Exception e) {
                                try {
                                    request.deny();
                                } catch (IllegalStateException ignored) {
                                    // ignore
                                }
                            }
                        });
                    }
                });
            }
        } catch (Exception ignored) {
            // Keep startup resilient if WebView bridge initializes lazily
        }
    }

    private void requestMissingRuntimePermissions() {
        try {
            List<String> needed = new ArrayList<>();
            addIfMissing(needed, Manifest.permission.CAMERA);
            addIfMissing(needed, Manifest.permission.ACCESS_FINE_LOCATION);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                addIfMissing(needed, Manifest.permission.BLUETOOTH_SCAN);
                addIfMissing(needed, Manifest.permission.BLUETOOTH_CONNECT);
            }

            if (!needed.isEmpty()) {
                ActivityCompat.requestPermissions(
                    this,
                    needed.toArray(new String[0]),
                    RNS_PERMISSION_REQUEST_CODE
                );
            }
        } catch (Exception ignored) {
            // Avoid crashing if Activity is finishing during permission check
        }
    }

    private void addIfMissing(List<String> target, String permission) {
        if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
            target.add(permission);
        }
    }
}
