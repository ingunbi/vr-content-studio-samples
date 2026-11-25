using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Windows.Forms;

sealed class LocalStudio : IDisposable {
    readonly string root;
    readonly TcpListener listener;
    readonly Thread worker;
    volatile bool closing;
    public readonly string Address;
    public LocalStudio(string folder) {
        root=Path.GetFullPath(folder).TrimEnd(Path.DirectorySeparatorChar)+Path.DirectorySeparatorChar;
        if(!File.Exists(Path.Combine(root,"index.html"))) throw new FileNotFoundException("web 폴더와 작품실 실행기를 같은 위치에 두세요.");
        listener=new TcpListener(IPAddress.Loopback,0);listener.Start(12);
        Address="http://127.0.0.1:"+((IPEndPoint)listener.LocalEndpoint).Port+"/";
        worker=new Thread(Accept);worker.IsBackground=true;worker.Start();
    }
    void Accept() {
        while(!closing) {
            try {TcpClient client=listener.AcceptTcpClient();ThreadPool.QueueUserWorkItem(_=>Serve(client));}
            catch(SocketException){if(closing)return;}
            catch(ObjectDisposedException){return;}
        }
    }
    static void Headers(Stream stream,string status,string type,long length){
        byte[] buffer=Encoding.ASCII.GetBytes("HTTP/1.1 "+status+"\r\nContent-Type: "+type+"\r\nContent-Length: "+length+
            "\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\n\r\n");
        stream.Write(buffer,0,buffer.Length);
    }
    static string Mime(string ext){
        switch(ext.ToLowerInvariant()){
            case ".html":return "text/html; charset=utf-8";
            case ".mjs":case ".js":return "text/javascript; charset=utf-8";
            case ".css":return "text/css; charset=utf-8";
            case ".jpg":return "image/jpeg";case ".png":return "image/png";case ".json":return "application/json";
            case ".wav":return "audio/wav"; case ".svg":return "image/svg+xml";
            default:return null;
        }
    }
    void Serve(TcpClient client){
        using(client){try{
            client.ReceiveTimeout=4000;client.SendTimeout=8000;
            using(NetworkStream stream=client.GetStream()){
                byte[] header=new byte[8192];int used=0;bool complete=false;
                while(used<header.Length){
                    int v=stream.ReadByte();if(v<0)return;header[used++]=(byte)v;
                    if(used>=4 && header[used-4]==13 && header[used-3]==10 && header[used-2]==13 && v==10){complete=true;break;}
                }
                if(!complete){Headers(stream,"400 Bad Request","text/plain",0);return;}
                string input=Encoding.ASCII.GetString(header,0,used);
                string[] lines=input.Split(new[]{"\r\n"},StringSplitOptions.None);
                string[] first=lines[0].Split(' ');
                if(first.Length!=3 || (first[0]!="GET" && first[0]!="HEAD") || !first[1].StartsWith("/")){Headers(stream,"400 Bad Request","text/plain",0);return;}
                string rel=Uri.UnescapeDataString(first[1].Split('?')[0]).TrimStart('/');
                if(rel.Length==0)rel="index.html";
                string file=Path.GetFullPath(Path.Combine(root,rel.Replace('/',Path.DirectorySeparatorChar)));
                string mime=Mime(Path.GetExtension(file));
                if(!file.StartsWith(root,StringComparison.OrdinalIgnoreCase) || mime==null || !File.Exists(file)){Headers(stream,"404 Not Found","text/plain",0);return;}
                using(FileStream fs=File.OpenRead(file)){Headers(stream,"200 OK",mime,fs.Length);if(first[0]=="GET")fs.CopyTo(stream);}
            }
        }catch(IOException){}catch(ArgumentException){}catch(UnauthorizedAccessException){}catch(NotSupportedException){}}
    }
    public void Dispose(){closing=true;listener.Stop();}
}

static class Studio {
    static readonly string Folder=AppDomain.CurrentDomain.BaseDirectory;
    static void Open(string target,string args=""){
        try{Process.Start(new ProcessStartInfo(target,args){UseShellExecute=true,WorkingDirectory=Folder});}
        catch(Exception ex){MessageBox.Show(ex.Message,"작품을 열 수 없습니다");}
    }
    [STAThread] static void Main(string[] args){
        Application.EnableVisualStyles();
        try {
            using(LocalStudio server=new LocalStudio(Path.Combine(Folder,"web"))){
                if(Array.IndexOf(args,"--serve")>=0){Console.WriteLine(server.Address);Console.Out.Flush();Console.ReadLine();return;}
                using(Form window=new Form()){
                    window.Text="VR 가상현실 콘텐츠 제작";window.ClientSize=new Size(700,592);
                    window.BackColor=Color.FromArgb(20,32,41);window.ForeColor=Color.White;
                    window.Font=new Font("Malgun Gothic",10);window.StartPosition=FormStartPosition.CenterScreen;window.FormBorderStyle=FormBorderStyle.FixedSingle;window.MaximizeBox=false;
                    Label heading=new Label{Text="어떤 작품을 열까요?",AutoSize=true,Location=new Point(28,22),Font=new Font("Malgun Gothic",23,FontStyle.Bold)};window.Controls.Add(heading);
                    string[,] works={{"VR 안전 점검실","문과 차단기 확인   ·   Unreal Engine","inspection"},{"달의 기록관","공간 전시와 큐레이션   ·   브라우저","gallery"},{"궤도 정비소","관측 장비 조립과 광학 시험   ·   브라우저","repair"},{"비 오는 밤의 소리극장","공간음향 믹싱과 공연   ·   브라우저","sound"},{"해협 우편선","물때에 맞춘 섬과 섬 사이의 항해   ·   브라우저","post"}};
                    for(int i=0;i<works.GetLength(0);++i){
                        string id=works[i,2];Button b=new Button{Text=works[i,0]+"     "+works[i,1],TextAlign=ContentAlignment.MiddleLeft,Location=new Point(28,85+i*85),Size=new Size(644,69),FlatStyle=FlatStyle.Flat,BackColor=Color.FromArgb(34,54,65),ForeColor=Color.White,Padding=new Padding(16,0,0,0)};
                        b.Click+=(s,e)=>{if(id=="inspection")Open(Path.Combine(Folder,@"native\Windows\Inspection.exe"),"-DesktopInspection -nohmd -Windowed -ResX=1280 -ResY=800");else Open(server.Address+"?project="+id);};
                        window.Controls.Add(b);
                    }
                    Label footer=new Label{Text="브라우저 작품을 사용하는 동안 이 창을 열어 두세요.",AutoSize=true,Location=new Point(29,525)};window.Controls.Add(footer);
                    Application.Run(window);
                }
            }
        }catch(Exception ex){MessageBox.Show(ex.Message,"VR 작품실");}
    }
}
