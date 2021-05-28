const PZIMG_PATH = 'images/pz-img/image.png';	// パズル画像のパス
const IMG_SIZE = 512;							// 画像サイズ（正方形であること） [px]
const POS_NUM = 16								// 配置数（4*4）
const PIECEID_INDEX = 5							// ピースのidのインデックス部分（piece0）
const MIN_SIDE_PADDING = 16						// 画面の両サイドに最低限入れるスペース [px]


var pos = []									// 各ピースの現在位置
var offset_con_x = 0;							// コンテンツ部分の開始位置（X) 
var offset_con_y = 0;							// コンテンツ部分の開始位置（Y） 
var cel_size = IMG_SIZE / 4;					// １つのセル画像の幅&高さ
var myWindow = {								// ウィンドウステータス
	w_size : 0,									// 画面幅
	h_size : 0,									// 画面高さ
	orient : "portrait"							// 起動時の画面の向き（portrait/landscape/square）
};
var score = {									// ゲームプレイスコア
	play_time: 0,								// 経過時間 [秒]
	slide_cnt: 0								// スライド数
};
var scale = 100;								// ウィンドウサイズに対する画像の表示倍率 [%]
var isPlaying = 0;								// プレイフラグ （0:未プレイ, 1:プレイ中）
var timer;										// タイマー格納変数


///////////////////////////////////
// main
///////////////////////////////////
$(function() {
	var select_index = 0;						// 選択ピース番号
	var blank_index = 0;						// 空ピース番号

	// 初期設定
	init();

	// 初期設定（ピース番号=セル番号）
	// セル番号15のピースはblankピースとしてゲームに使用しない
	offset_con_y = document.getElementById("id_con").offsetTop;
	for (var i = 0; i < POS_NUM; i++) {
		pos[i] = i;
	}
	blank_index = POS_NUM - 1;

	// 配置シャッフル
	// 解答不可能な問題の場合は再シャッフル
	do{
		for (var i = POS_NUM; i > 0; i--) {
			var j = Math.floor(Math.random() * i);
			swap(i - 1, j);
		}
	}while(!isPossiblePuzzle(pos))

	// ピースを配置（ゲーム開始配置）
	for (var i = 0; i < POS_NUM; i++) {
		if (i != blank_index) {
			$('<div id="piece' + i + '" class="piece"></div>').css({
    			backgroundPosition: '-' + getx(i) + 'px -' + gety(i) + 'px',
    			left: getx(pos[i]), top: gety(pos[i])
			}).appendTo($('#id_con'));
		}
	}

	// パズルピースの表示サイズを指定
	$("div.piece").width(cel_size * scale);
	$("div.piece").height(cel_size * scale);
	$("div.piece").css('background-size', IMG_SIZE * scale + 'px');


	// ピースクリック時の処理
	$('.piece').click(function() {
		// 初回クリック時のみタイマースタート（1sec毎にカウントアップ）
		if (isPlaying == 0) {
			timer = setInterval(getPlayTime, 1000);
			document.getElementById("id_playtime").innerHTML = score.play_time;
			isPlaying = 1;
		}

		// ピース入れ替え
		select_index = this.id.substring(PIECEID_INDEX);
		switch(pos[select_index] - pos[blank_index]) {
			case  4 :    // 選択ピースの上にblankピースがある
				// 選択ピースとblankピースを入れ替える
				slidePiece(this, select_index, blank_index);
				break;

			case  1 :    // 選択ピースの左にblankピースがある
				// 最左列から最右列への移動は無視
				if(pos[select_index] == 4 || pos[select_index] == 8 || pos[select_index] == 12){
					break;
				}
				// 選択ピースとblankピースを入れ替える
				slidePiece(this, select_index, blank_index);
				break;

			case -4 :    // 選択ピースの下にblankピースがある
				// 選択ピースとblankピースを入れ替える
				slidePiece(this, select_index, blank_index);
				break;

			case -1 :    // 選択ピースの右にblankピースがある
				// 最右列から最左列への移動は無視
				if(pos[select_index] == 3 || pos[select_index] == 7 || pos[select_index] == 11){
					break;
				}
				// 選択ピースとblankピースを入れ替える
				slidePiece(this, select_index, blank_index);
				break;

			default :
				// blankピースと隣接していなければ何もしない
				break;
		}

	});

	// refreshボタンクリック時の処理
	$('#id_refresh').click(pzRefresh);

	// 画面向き変更のイベントハンドラ
	$(window).bind('orientationchange', function(e){
		orientaionChange(blank_index);
	});

});


///////////////////////////////////
// ピースの番号から座標を得る。
///////////////////////////////////
function getx(n) {return (n % 4) * cel_size * scale;}
function gety(n) {return Math.floor(n / 4) * cel_size * scale;}

///////////////////////////////////
// ピースの配列を入れ替える。
///////////////////////////////////
function swap(i, j) {
  var tmp = pos[i];
  pos[i] = pos[j];
  pos[j] = tmp;
}

///////////////////////////////////
// 選択ピースとblankピースを入れ替える
///////////////////////////////////
function slidePiece(target, select_index, blank_index) {
	swap(select_index, blank_index);				
	$(target).animate({left: getx(pos[select_index]), top: gety(pos[select_index])}, function() {
		// アニメーション終了時にクリア判定する。
		var isClear = 1;			// ゲームクリアフラグ（0:未クリア、1:クリア）
		for (var i = 0; i < POS_NUM; i++) if (pos[i] != i) isClear = 0;
   			if (isClear == 1) {
   				//	クリア時表示
   				pzFinish();
   			}
		});
		// スライド数更新
		score.slide_cnt++;
		document.getElementById("id_slidecnt").innerHTML = score.slide_cnt;
}

///////////////////////////////////
// 終了処理
///////////////////////////////////
function pzFinish() {
	var rtn;
	clearInterval(timer);	// タイマーストップ
	$("div.piece").remove();
	$("div#id_con").append('<img src=' + PZIMG_PATH +' width="100%" height="100%">');
	rtn = window.confirm("Congratulations!!\n\nRestart now?");
	if (rtn) {
		pzRefresh();		// 再シャッフル
	}
}

///////////////////////////////////
// 問題解答可否チェック
///////////////////////////////////
function isPossiblePuzzle(ary) {
	var aryTmp = new Array(POS_NUM);
    var tmp = 0;
    var changingCount = 0;

    for (var i = 0; i < POS_NUM; i++){
		aryTmp[i] = ary[i];
	}
 
    // 数値交換回数を求める
    for (var i = 0; i < aryTmp.length - 1; i++) {
        for (var j = i + 1; j < aryTmp.length; j++) {
            if (i + 1 == aryTmp[j]) {
                tmp = aryTmp[i];
                aryTmp[i] = aryTmp[j];
                aryTmp[j] = tmp;
                changingCount++;
                break;
            }
        }
    }
 
    // 交換回数が偶数なら解ける、奇数なら解けない
    if (changingCount % 2 == 0) {
        return true;
    } else {
        return false;
    }
}

///////////////////////////////////
// 画面向き変更時の処理
///////////////////////////////////
function orientaionChange(blank_index){
	// 表示設定値を再設定
	init();

	// ピース表示位置を再設定（並びは変更しない）
	for (var i = 0; i < POS_NUM; i++) {
		if (i != blank_index) {
			$("div#piece" + i).css({
    			//'background-position': '-' + getx(i) + 'px -' + gety(i) + 'px',
    			left: getx(pos[i]),
    			top: gety(pos[i])
			});
		}
	}

	// パズルピースの表示サイズを指定
	$("div.piece").width(cel_size * scale);
	$("div.piece").height(cel_size * scale);
	$("div.piece").css('background-size', IMG_SIZE * scale + 'px');
}


///////////////////////////////////
// ブラウザのウィンドウステータスを取得
///////////////////////////////////
function getWindowStat() {
	// 画面サイズ取得
	myWindow.w_size = window.innerWidth;
	myWindow.h_size = window.innerHeight;

	// 画面の向きを判定
	if (myWindow.w_size < myWindow.h_size) {
		// 縦長
		myWindow.orient = "portrait";
	} else if (myWindow.w_size > myWindow.h_size) {
		// 横長
		myWindow.orient = "landscape";
	} else {
		// 正方形
		myWindow.orient = "square";
	}
}

///////////////////////////////////
// 初期化処理
///////////////////////////////////
function init() {
	var pzAreaSize = 0;							// パズル表示領域の一辺の長さ（正方形であること） [px]

	// ウィンドウサイズおよび画面の向きを取得
	getWindowStat();

	// パズル表示領域の一辺の長さを設定
	if (myWindow.orient == "portrait") {
		pzAreaSize = myWindow.w_size - (MIN_SIDE_PADDING * 2);
	} else {
		pzAreaSize = myWindow.h_size - $("div#id_head").height() - $("table#id_score").height();
	}

	// コンテンツ表示領域のサイズを指定
	document.getElementById("id_outerframe").style.width = pzAreaSize + "px";
	document.getElementById("id_outerframe").style.height = document.getElementById("id_outerframe").style.width;

	// パズル表示領域のサイズを指定
	document.getElementById("id_con").style.width = pzAreaSize + "px";
	document.getElementById("id_con").style.height = document.getElementById("id_con").style.width;

	// ウィンドウサイズに対する画像の表示縮尺を計算
	scale = pzAreaSize / IMG_SIZE;
}


///////////////////////////////////
// パズルの再シャッフル
///////////////////////////////////
function pzRefresh() {
	clearInterval(timer);
	window.location.reload();
}


///////////////////////////////////
// 経過時間計測
///////////////////////////////////
function getPlayTime() {
	score.play_time++;
	document.getElementById("id_playtime").innerHTML = score.play_time;
}

/*****************
<Index of piece>
   0  1  2  3
   4  5  6  7
   8  9 10 11
  12 13 14 15
******************/