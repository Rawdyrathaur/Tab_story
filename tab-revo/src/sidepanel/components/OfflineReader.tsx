import { useEffect, useRef, useState } from 'react';
import { ArrowLeftIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { getOfflineArticle, saveReaderProgress } from '../../reminders/offlineReader';
import type { OfflineArticle } from '../db';

export function OfflineReader({ articleId, onClose }: { articleId: string; onClose: () => void }) {
  const [article,setArticle] = useState<OfflineArticle>(); const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => { void getOfflineArticle(articleId).then(setArticle); }, [articleId]);
  useEffect(() => { const node=scroll.current; if(!node||!article)return; node.scrollTop=article.readProgress*Math.max(0,node.scrollHeight-node.clientHeight); let timer=0; const track=()=>{clearTimeout(timer);timer=window.setTimeout(()=>void saveReaderProgress(article.id,node.scrollTop/Math.max(1,node.scrollHeight-node.clientHeight)),1000)}; node.addEventListener('scroll',track); return()=>{node.removeEventListener('scroll',track);clearTimeout(timer)}; },[article]);
  if(!article) return null;
  return <div className="offline-reader-screen"><header><button onClick={onClose} aria-label="Back"><ArrowLeftIcon /></button><span>Offline copy</span><button onClick={()=>chrome.tabs.create({url:article.url})}>Open original <ArrowTopRightOnSquareIcon /></button></header><div ref={scroll} className="offline-reader-scroll"><article><small>Saved {new Date(article.savedAt).toLocaleDateString()} · {article.readingMinutes} min read</small><h1>{article.title}</h1><p>{[article.byline,article.siteName].filter(Boolean).join(' · ')}</p><div dangerouslySetInnerHTML={{__html:article.contentHtml}} /></article></div></div>;
}
