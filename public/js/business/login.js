/// <reference path="../config/cityInfo.js" />
/// <reference path="../common/tools.js" />
/// <reference path="base.js" />

$(function () {
    $("body").keyup(function (e) {
        if (e.which==13) {
            if ($("#inputEmail").val() == "") {
                $("#inputEmail").focus();
                return;
            }
            if ($("#inputPassword").val() == "") {
                $("#inputPassword").focus();
                return;
            }
            if ($("#inputCptcha").val() == "") {
                $("#inputCptcha").focus();
                return;
            }
            $("#btnLogin").trigger("click");
        }
    });
    $("input.form-control").keydown(function () {
        $(".texterror").empty();
    })
    $("body").niceScroll(); //滚动条
    ChangeTentnatName();
 
    //清楚cookie
    clearCookie();
    $("#register").bind("click", function () {
        var text = "请联系管理员";
        //$(".texterror").toggle(function () {
        //    $(".texterror").text(text).hide();
        //}, function () {
        //    $(".texterror").text(text).show();
        //});
        $(".texterror").text(text);
    });
    
    function Footcss() {
        var $Hei = $(window).height() - $(".login_top").height() - $("#foot").height() - $("#login_con").height();
        if ($Hei < 100) {
            $Hei = 100;
        }
        $("#login_con").css({ "margin-top": $Hei / 2, "margin-bottom": $Hei / 2 })

    }
    Footcss();
    $(window).resize(function () {
        Footcss();
    })
    function GenerateVerificationCode() {
        //生成验证码
        $('.yzm').attr('src', window.baseTools.getSecurityCode());
    }
    function ChangeTentnatName() {
        var ccname = $.cookie(cookieInfo.ccname);
        var currentCityName = window.global.CustormerLogo[ccname == null ? "软通动力" : ccname];;//ccname==null?currentCity[10]:ccname;
        var txt=currentCityName + "政府舆情监测系统";
        $("#citySystem").text(txt);
        document.title=txt+'登陆';
    }

    function Login() {
        var ccname=$.cookie(cookieInfo.ccname);
        var inputEmail = $("#inputEmail").val();
        var inputPassword = $("#inputPassword").val();
        var inputCptcha = $("#inputCptcha").val();
        ChangeTentnatName();


        //var chbRemValue = $('#chbRem')[0].checked
        var chbRemValue = false;
        if (inputEmail=="") {
            $("#inputEmail").focus();
            return;
        }
        if (inputPassword=="") {
            $("#inputPassword").focus();
            return;
        }
        if (inputCptcha=="") {
            $("#inputPassword").focus();
            return;
        }
        if (inputEmail != "" && inputPassword != "" && inputCptcha != "") {
            var user = {
                cname:ccname,"userName": inputEmail, "userPwd": inputPassword,
                "isRem": chbRemValue, 'verificationCode': inputCptcha,'returnUrl':'/index.html#index'
            };
            $("#btnLogin").addClass("loginloading");
            window.baseTools.checkLogin(user, function (data) {
                switch (data.loginStatus) {
                    case 1:
                         initalCookie(data.clientInfo);
                        window.location.href = "/index.html#index";
                        break;
                    case -2:
                        //alert("验证码错误");
                        $(".texterror").text("验证码错误");
                        $("#inputCptcha").focus().val("");
                        GenerateVerificationCode();
                        $("#btnLogin").removeClass("loginloading");
                        break;
                    case -3:
                        $(".texterror").text("用户未启用请联系管理员");
                        GenerateVerificationCode();
                        $("#btnLogin").removeClass("loginloading");
                        break;
                    case -4:
                        $(".texterror").text("无法登录["+ccname+"]舆情监测系统");
                        GenerateVerificationCode();
                        $("#btnLogin").removeClass("loginloading");
                        break;
                    default:
                        $(".texterror").text("用户或密码错误");
                        $("#inputPassword").focus().val("");
                        GenerateVerificationCode();
                        $("#btnLogin").removeClass("loginloading");
                        break;
                }
            });
        } else {
          
            //$(".texterror").text("用户名密码验证码不能为空！")
        }
    }
    $('.yzm').click(function () {
        GenerateVerificationCode();
    });
    $("#btnLogin").click(function () {
        Login();
    })
    GenerateVerificationCode();
});