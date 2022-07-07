#!/bin/bash

# ffmpeg -i input -r 24 -vf scale=1920:1080 output
# -r位置决定他是指定的输入文件还是输出文件，控制帧率
# -vf scale=640:360：分辨率
# -b:v 900k -bufsize 900k： 码率
# des="${src%.*}.mp4"
set -x
if [ $# -eq 4 ]; then
    dir=$1
    src=$2
    rate=$3
    frame=$4
    des="tem$src"
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
    `ffmpeg -y -i $src -r $rate -c copy $des >/dev/null 2>&1`
    mv -f $des $src
    rm -rf $des
    exit 0
elif [ $# -eq 5 ]; then
    dir=$1
    src1=$2
    src2=$3
    rate=$4
    frame=$5
    des2="tem$src2"
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
    `ffmpeg -y -i $src2 -r $rate -c copy $des2 >/dev/null 2>&1`
    `echo file $src1 >> ${src2%.*}.txt`
    `echo file $des2 >> ${src2%.*}.txt`
    `ffmpeg -y -safe 0 -f concat -i ${src2%.*}.txt -c copy tem$src1 >/dev/null 2>&1`
    mv -f tem$src1 $src1
    rm -rf $src2 $des2 ${src2%.*}.txt
    exit 0
else
    exit 1
fi
