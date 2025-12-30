import { ExportTarget } from "../exporter/exporter";
import type { Quiz } from "../quiz";
import { AUDIO_FORMATS, IMAGE_FORMATS, VIDEO_FORMATS, isExternalURL, isValidMediaType, parseExtension } from "../tools/parser";
import { DynamicNodeParams } from "./createQuestionNode";

export type MediaNodeType = HTMLImageElement | HTMLIFrameElement | HTMLAnchorElement | HTMLVideoElement | HTMLAudioElement;

export enum MediaType
{
    NONE = "none",
    IMAGE = "image",
    VIDEO = "video",
    AUDIO = "audio"
}

export const getFirstSourceFromMedia = (node:HTMLImageElement|HTMLVideoElement|HTMLAudioElement) =>
{
    let source = node.src;
    const isAudioOrVideo = (node instanceof HTMLAudioElement || node instanceof HTMLVideoElement);
    if(!isAudioOrVideo) { return source; }

    const hasSources = node.getElementsByTagName("source").length > 0;
    if(!hasSources) { return source; }
    
    const pathParts = node.getElementsByTagName("source")[0].src.split("/"); 
    source = pathParts[pathParts.length - 1];
    return source;
}

export const transformMediaNodeForExportTarget = (node:MediaNodeType, target = ExportTarget.SCREEN) =>
{
    if(node instanceof HTMLAnchorElement) 
    { 
        const mediaNode = document.createElement("p");
        mediaNode.innerHTML = `LINK | URL: ${node.href}`; 
        return mediaNode;
    }

    if(node instanceof HTMLIFrameElement) 
    { 
        const mediaNode = document.createElement("p");
        mediaNode.innerHTML = `IFRAME | URL: ${node.src}`; 
        return mediaNode;
    }

    let mediaPath = getFirstSourceFromMedia(node);
    
    const mediaType = getMediaType(mediaPath);
    const shouldShowPrintVersion = (target == ExportTarget.PRINT) && mediaType != "image";
    if(!shouldShowPrintVersion) { return node; }

    const mediaNode = document.createElement("p");
    mediaNode.innerHTML = `MEDIA | ${mediaType.toUpperCase()} | FILE: ${mediaPath}`;
    return mediaNode;
}

export const getMediaType = (name:string) =>
{
    const ext = parseExtension(name);
    const isImage = IMAGE_FORMATS.includes(ext);
    if(isImage) { return MediaType.IMAGE; }

    const isVideo = VIDEO_FORMATS.includes(ext);
    if(isVideo) { return MediaType.VIDEO; }

    const isAudio = AUDIO_FORMATS.includes(ext);
    if(isAudio) return MediaType.AUDIO;

    return MediaType.NONE;
}

export const createMediaNodeIfNeeded = (txt:string, quiz:Quiz) =>
{
    const type = getMediaType(txt);
    if(type == MediaType.NONE)
    {
        const span = document.createElement("span");
        span.innerHTML = txt;
        return span;
    }

    return createMediaNode({ value: txt }, quiz);
}

export const createMediaNode = (params:DynamicNodeParams, quiz: Quiz) : MediaNodeType =>
{
    const value = params.value ?? "no-value";
    const fullPath = quiz.loader.getFullMediaPath(value);
    const number = params.number ?? 0;

    const mediaType = getMediaType(fullPath);
    const externalNonFile = isExternalURL(value, quiz.params) && !isValidMediaType(value);

    if(mediaType == MediaType.IMAGE)
    {
        const img = document.createElement("img");
        img.src = fullPath;
        img.dataset.id = number.toString();
        return img;
    }

    if([MediaType.AUDIO, MediaType.VIDEO].includes(mediaType))
    {
        const elem = document.createElement(mediaType) as (HTMLAudioElement|HTMLVideoElement);
        elem.setAttribute("controls", "controls");
        if(quiz.params.mediaAutoPlay) { elem.autoplay = true; }
        elem.dataset.id = number.toString();

        const source = document.createElement("source");
        source.src = fullPath;
        elem.appendChild(source);
        return elem;
    } 

    if(externalNonFile)
    {
        if(quiz.params.loadExternalMediaAsIframe) {
            const iframe = document.createElement("iframe");
            iframe.src = value;
            return iframe;
        } else {
            const a = document.createElement("a");
            a.href = value;
            a.innerHTML = value;
            return a;
        }
    }

    const placeholder = document.createElement("video");
    placeholder.innerHTML = `Can't create media ${value} (full path = ${fullPath}) with number ${number}`;
    return placeholder;
}