package com.inkwhack.weighttracker;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.*;
import android.net.Uri;
import android.content.Intent;
import android.app.AlertDialog;
import androidx.webkit.WebViewAssetLoader;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private WebView web;
    private ValueCallback<Uri[]> files;
    private String backup;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        web=new WebView(this); setContentView(web);
        web.setOnApplyWindowInsetsListener((v,insets)->{v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(true);
        WebViewAssetLoader loader=new WebViewAssetLoader.Builder().addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
        web.setWebViewClient(new WebViewClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r){
                WebResourceResponse local=loader.shouldInterceptRequest(r.getUrl());
                return local!=null?local:new WebResourceResponse("text/plain","UTF-8",new java.io.ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){return !r.getUrl().toString().startsWith("https://appassets.androidplatform.net/assets/");}
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onJsConfirm(WebView v,String url,String message,JsResult result){new AlertDialog.Builder(MainActivity.this).setMessage(message).setPositiveButton("OK",(d,w)->result.confirm()).setNegativeButton("Cancel",(d,w)->result.cancel()).setOnCancelListener(d->result.cancel()).show();return true;}
            @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> callback,FileChooserParams params){if(files!=null)files.onReceiveValue(null);files=callback;Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.setType("application/json");i.addCategory(Intent.CATEGORY_OPENABLE);startActivityForResult(i,1);return true;}
        });
        web.addJavascriptInterface(new Object(){@JavascriptInterface public void exportBackup(String json){backup=json;runOnUiThread(()->{Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);i.setType("application/json");i.addCategory(Intent.CATEGORY_OPENABLE);i.putExtra(Intent.EXTRA_TITLE,"weight-tracker-backup.json");startActivityForResult(i,2);});}},"AndroidBackup");
        web.loadUrl("https://appassets.androidplatform.net/assets/index.html");
    }
    @Override protected void onActivityResult(int request,int result,Intent intent){super.onActivityResult(request,result,intent);if(request==1&&files!=null){files.onReceiveValue(result==RESULT_OK&&intent!=null?new Uri[]{intent.getData()}:null);files=null;}if(request==2&&result==RESULT_OK&&intent!=null){try(java.io.OutputStream out=getContentResolver().openOutputStream(intent.getData())){out.write(backup.getBytes(StandardCharsets.UTF_8));}catch(Exception e){new AlertDialog.Builder(this).setMessage("Backup could not be saved. Please try again.").setPositiveButton("OK",null).show();}}}
    @Override public void onBackPressed(){web.evaluateJavascript("(()=>{const b=document.querySelector('[data-action=cancel]');if(b){b.click();return true}return false})()",result->{if(!"true".equals(result))finish();});}
}
