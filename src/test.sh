#!/bin/bash

if [ $# -eq 2 ]; then
    # 转化webm为mp4
    dir=$1
    src=$2
    des="${src%.*}.mp4"
    echo "$dir $src $des"
    # 跳转到uploads文件夹下
    cd uploads
    if [ ! -d "$dir" ]; then
        mkdir -p $dir
    fi
    if [ ! -f "$src" ]; then
        exit 1
    else
        mv $src $dir
    fi
    # 跳转到dir下，操作视频文件
    cd $dir
    ffmpeg -i $src $des
    rm -rf $src1
elif [ $# -eq 3 ]; then
    # 转化webm为mp4并同src1合并
    dir=$1
    src1=$2
    src2=$3
    des2="${src2%.*}.mp4"
    echo "$dir $src1 $src2 $des2"
    # 跳转到uploads文件夹下
    cd uploads
    if [ ! -d "$dir" ]; then
        mkdir -p $dir
    fi
    if [ ! -f "$src2" ]; then
        exit 1
    else
        mv $src2 $dir
    fi
    # 跳转到dir下，操作视频文件
    cd $dir
    ffmpeg -i $src2 $des2
    echo "file $src1" >> "${src2%.*}.txt"
    echo "file $des2" >> "${src2%.*}.txt"
    ffmpeg --y -f concat -i ${src2%.*}.txt -c copy $src1
    rm -rf $src2 $des2 ${src2%.*}.txt
else
    exit 1
fi