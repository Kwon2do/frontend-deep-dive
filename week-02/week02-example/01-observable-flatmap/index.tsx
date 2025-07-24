import { Observable } from "rxjs";
import { from } from "rxjs";
export default function ObservableFlatmapPage() {
  const onClickButton = (): void => {
    //new Promise((resolve, reject) => {});
    //new Observable((observer) => {});

    //프로미스면 fromPromise()
    from(["1번 useQuery", "2번 useQuery", "3번 useQuery"])
      .flatMap((el) => {
        from([`${el} 결과에 qqq적용`, `${el} 결과에 eee적용`]);
      })
      //실행
      .subscribe((el) => {
        console.log(el);
      });
  };
  return <button onClick={onClickButton}>클릭</button>;
}
