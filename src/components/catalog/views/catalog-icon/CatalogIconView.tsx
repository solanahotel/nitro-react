import { FC, useMemo } from 'react';
import { GetConfiguration } from '../../../../api';
import { LayoutImage } from '../../../../common/layout/LayoutImage';

export interface CatalogIconViewProps
{
    icon: number;
}

export const CatalogIconView: FC<CatalogIconViewProps> = props =>
{
    const { icon = 0 } = props;

    const getIconUrl = useMemo(() =>
    {
        return ((GetConfiguration<string>('catalog.asset.icon.url')).replace('%name%', icon.toString()));
    }, [ icon ]);

    // No catalog icon assets are provided; render nothing when the page has no
    // icon (iconId 0) so the left menu shows clean text instead of broken images.
    if(!icon) return null;

    return <LayoutImage imageUrl={ getIconUrl } style={ { width: 20, height: 20 } } />;
}
