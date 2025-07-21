# refreshToken

## RefreshToken 이란?

**`AccessToken`** 은 사용자의 로그인 정보를 담고 있는 **`JWT토큰 데이터`** 이다.

이 AccessToken 데이터는 보안상의 이유로 일정 시간 동안만 유효하도록 만료 기한이 정해져 있음.

만료 기한이 지나고 사용자가 로그인 정보가 필요한 페이지에 접근하려고 하면 백엔드에서 미리 지정해둔 경로로 redirect 되거나 에러가 뜨게 된다.

이때, 새로운 AccessToken을 발급받고 갱신하는 과정이 필요한데 이 과정에서 사용되는 토큰을 **`RefreshToken`** 이라 한다.

RefreshToken은 보통 2주~1개월 정도로 AccessToken에 비해 상대적으로 긴 만료기한을 가지고 있다.

## 그렇다면, RefreshToken을 어디에 저장할 것인가?

RefreshToken은 보통 사용자 브라우저 저장소, 즉 **`localStorage`**, **`sessionStorage`**, 또는 **`cookie`** 에 저장한다.

로컬/세션 스토리지의 경우 **보안에 취약**하기 때문에 토큰을 취급할 때에는 사용하지 않고

**`쿠키에 RefreshToken을 담아서 받아오게 됩니다.`**

> **쿠키의 secure / httpOnly 옵션**
>
> 쿠키라고 해서 매우 안전한 것은 아니다.
>
> 하지만 로컬/세션 스토리지와는 다르게 **secure, httpOnly** 등의 옵션을 설정할 수 있다.
>
> **`httpOnly`** : 브라우저에서 Javascript를 이용해 쿠키에 접근할 수 없고, 통신으로만 해당 데이터를 주고받을 수 있다.
>
> **`secure`** : https 통신 시에만 해당 쿠키를 받아올 수 있다.

## 굳이 RefreshToken을 사용해야 할까?

AccessToken 을 **1시간 동안만 사용할 수 있다고 가정**했을 때

1시간 동안은 AccessToken을 인가 시에 사용할 수 있다.

하지만 1시간 1분이 되자마자 이전에 발급 받은 AccessToken은

**`시간 만료로 인해 사용할 수 없는 토큰`** 이 되어버린다.

그러면, 유저 입장에서는 1시간마다 계속 로그인해줘야하는 불편함을 겪게되고 이는 서비스 만족도를 떨어뜨리게 된다.

근데 만약 RefreshToken을 도입한다면,
사용자의 AccessToken이 만료된 상태로 통신 요청을 하더라도 **서비스 뒷단에서 RefreshToken을 확인하고 새로운 AccessToken을 발급한 후 기존 통신 요청을 재시도** 하기때문에
유저 입장에서는 전혀 불편함 없이 서비스를 이용할 수 있게 된다.

단계별로 간단하게 정리하자면 아래와 같다.

#### RefreshToken을 이용해 AccessToken을 새로 발급받는 과정

1. AccessToken 만료 후 인가 요청
2. 해당 오류를 포착해서 인가 에러인지 체크
3. RefreshToken으로 AccessToken 재발급 요청
4. 발급 받은 AccessToken을 state에 재저장
5. 방금 실패했던(error) API를 재요청

---

# 마이크로 서비스 아키텍처 (Microservice Architecture)

**`마이크로 서비스 아키텍쳐 (Micro Service Architecture / MSA)`** 란

백엔드의 서비스를 작은 단위로 쪼개 서로 다른 컴퓨터에 담는 서비스 구조를 뜻한다.

<img src='/assets/images/week02-01.png'/>

일반적으로 인증/인가와 관련된 API를 담아 놓은 **`인증 서비스`**,

컨텐츠를 처리하는 것과 관련된 API를 담아 놓은 **`리소스 서비스`** 로 나뉘며,

리소스 서비스도 **각각의 API의 용도에 따라 더 잘게 쪼개는 것이 가능**하다.

## 마이크로 서비스 아키텍처의 장점

1. 각각의 서비스를 필요에 따라 다른 언어나 구조로 만들 수 있음.
2. 백엔드 서비스가 다운되더라도 문제가 발생한 일부 마이크로 서비스만 다운될 뿐 서비스 전체가 접속 불가능해지는 사태는 일어나지 않음.
